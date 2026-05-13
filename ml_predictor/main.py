import os
import threading
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from auth import get_supabase_client, verify_jwt, verify_baby_ownership
import xgboost as xgb
import math
from features import extract_features, extract_features_next
from model_store import (
    get_model_version,
    get_models,
    global_model_status,
    has_global_model,
    load_global_metadata,
    sync_global_model_from_storage,
)
from explanation import generate_explanation
from evaluation import evaluate_sleep_prediction_audits
from train import train_global_model

app = FastAPI(title="BabySync ML Predictor (XGBoost)", version="2.0.0")

AUTO_TRAIN_ON_PREDICT = os.environ.get("AUTO_TRAIN_ON_PREDICT", "true").lower() in {"1", "true", "yes"}
try:
    AUTO_RETRAIN_MAX_AGE_HOURS = int(os.environ.get("AUTO_RETRAIN_MAX_AGE_HOURS", "24"))
except ValueError:
    AUTO_RETRAIN_MAX_AGE_HOURS = 24
CRON_SECRET = os.environ.get("CRON_SECRET") or os.environ.get("ML_CRON_SECRET")
MIN_PREDICTED_DURATION_SECONDS = 15 * 60
MAX_PREDICTED_DURATION_SECONDS = 12 * 3600

_training_lock = threading.Lock()
_training_state = {
    "running": False,
    "last_reason": None,
    "last_started_at": None,
    "last_finished_at": None,
    "last_error": None,
    "last_accepted": None,
}

class SleepRecord(BaseModel):
    duration_seconds: int
    start_time: int
    end_time: int
    quality: int

class PredictionRequest(BaseModel):
    baby_id: str
    baby_age_months: float
    recent_sleeps: List[SleepRecord]
    current_time_ms: int
    force_retrain: Optional[bool] = False
    feed_count_24h: Optional[int] = 0
    walk_duration_24h: Optional[int] = 0
    is_sick: Optional[bool] = False

class PredictionResponse(BaseModel):
    next_sleep_time_ms: int
    recommended_duration_seconds: int
    predicted_duration_seconds: Optional[int] = None
    confidence_score: float
    source: str
    model_version: Optional[str] = None
    explanation: Optional[str] = None

class EvaluationRequest(BaseModel):
    baby_id: str
    lookback_days: Optional[int] = 14
    limit: Optional[int] = 50

class EvaluationResponse(BaseModel):
    evaluated_count: int
    pending_count: int

class TrainResponse(BaseModel):
    started: bool
    state: dict

# Features extraction moved to features.py

def training_state_snapshot() -> dict:
    with _training_lock:
        return dict(_training_state)

def _parse_trained_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None

def clamp_predicted_duration(value: int) -> int:
    return max(MIN_PREDICTED_DURATION_SECONDS, min(int(value), MAX_PREDICTED_DURATION_SECONDS))

def clamp_next_sleep_time(value: int, current_time_ms: int) -> int:
    return max(int(value), int(current_time_ms))

def model_needs_training(source: str | None = None) -> bool:
    if source == "ema" or not has_global_model():
        return True
    if AUTO_RETRAIN_MAX_AGE_HOURS <= 0:
        return False

    metadata = load_global_metadata()
    trained_at = _parse_trained_at(metadata.get("trained_at"))
    if trained_at is None:
        return True

    age_hours = (datetime.now(timezone.utc) - trained_at).total_seconds() / 3600
    return age_hours >= AUTO_RETRAIN_MAX_AGE_HOURS

def start_background_training(reason: str, force: bool = False) -> bool:
    if not force and not AUTO_TRAIN_ON_PREDICT:
        return False

    with _training_lock:
        if _training_state["running"]:
            return False
        _training_state.update({
            "running": True,
            "last_reason": reason,
            "last_started_at": datetime.now(timezone.utc).isoformat(),
            "last_finished_at": None,
            "last_error": None,
            "last_accepted": None,
        })

    def run_training():
        try:
            result = train_global_model()
            sync_global_model_from_storage(force=True)
            with _training_lock:
                _training_state["last_accepted"] = bool(result.get("accepted")) if isinstance(result, dict) else None
        except Exception as e:
            with _training_lock:
                _training_state["last_error"] = str(e)
            print(f"Background training failed: {e}")
        finally:
            with _training_lock:
                _training_state["running"] = False
                _training_state["last_finished_at"] = datetime.now(timezone.utc).isoformat()

    thread = threading.Thread(target=run_training, name="global-model-training", daemon=True)
    thread.start()
    return True

def verify_cron_secret(x_cron_secret: Optional[str] = Header(None, alias="x-cron-secret")) -> bool:
    if not CRON_SECRET:
        raise HTTPException(status_code=503, detail="CRON_SECRET is not configured")
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")
    return True

@app.on_event("startup")
def startup_model_sync():
    sync_global_model_from_storage(force=True)
    if model_needs_training():
        start_background_training("startup_model_missing_or_stale")

def record_prediction_audit(req: PredictionRequest, prediction: PredictionResponse):
    """
    Best-effort audit write. Prediction delivery must not depend on audit table availability.
    """
    predicted_duration_seconds = prediction.predicted_duration_seconds or prediction.recommended_duration_seconds
    payload = {
        "baby_id": req.baby_id,
        "request_time_ms": req.current_time_ms,
        "predicted_next_sleep_time_ms": prediction.next_sleep_time_ms,
        "predicted_duration_seconds": predicted_duration_seconds,
        "confidence_score": prediction.confidence_score,
        "source": prediction.source,
        "model_version": prediction.model_version,
    }

    try:
        get_supabase_client().table("sleep_predictions_audit").insert(payload).execute()
    except Exception as first_error:
        try:
            minimal_payload = {
                "baby_id": payload["baby_id"],
                "predicted_next_sleep_time_ms": payload["predicted_next_sleep_time_ms"],
                "predicted_duration_seconds": payload["predicted_duration_seconds"],
                "confidence_score": payload["confidence_score"],
            }
            get_supabase_client().table("sleep_predictions_audit").insert(minimal_payload).execute()
        except Exception as fallback_error:
            print(f"Prediction audit skipped: {fallback_error} (full insert failed with: {first_error})")

@app.post("/predict_sleep", response_model=PredictionResponse)
async def predict_next_sleep(
    req: PredictionRequest,
    user_id: str = Depends(verify_jwt)
):
    """
    Predics the next sleep time and duration using XGBoost on the fly
    """
    await verify_baby_ownership(req.baby_id, user_id)
    try:
        evaluate_sleep_prediction_audits(req.baby_id, lookback_days=14, limit=50)
    except Exception as e:
        print(f"Prediction evaluation skipped: {e}")
    
    sorted_sleeps = sorted(req.recent_sleeps, key=lambda x: x.start_time)
    last_sleep = sorted_sleeps[-1] if sorted_sleeps else None

    # Fallback 1: Rule-based (Wake Windows) if not enough data
    if len(req.recent_sleeps) < 10:
        wake_window_hours = 2.0
        if req.baby_age_months < 1: wake_window_hours = 1.0
        elif req.baby_age_months < 3: wake_window_hours = 1.5
        elif req.baby_age_months < 6: wake_window_hours = 2.0
        elif req.baby_age_months < 9: wake_window_hours = 2.5
        elif req.baby_age_months < 12: wake_window_hours = 3.0
        else: wake_window_hours = 4.0
        
        if last_sleep:
            next_sleep_start = clamp_next_sleep_time(
                last_sleep.end_time + int(wake_window_hours * 3600 * 1000),
                req.current_time_ms,
            )
            rec_duration = 3600
        else:
            next_sleep_start = req.current_time_ms + 3600 * 1000
            rec_duration = 3600
        
        response = PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=rec_duration,
            predicted_duration_seconds=rec_duration,
            confidence_score=0.4, # Low confidence due to hardcoded rules
            source="rule_based"
        )
        record_prediction_audit(req, response)
        return response

    # ML Mode: Inference using pre-trained models
    sleeps_dicts = [s.model_dump() for s in req.recent_sleeps]
    X, y_wake, y_duration = extract_features(
        sleeps=sleeps_dicts,
        age_months=req.baby_age_months,
        feed_count=req.feed_count_24h,
        walk_duration=req.walk_duration_24h,
        is_sick=req.is_sick
    )
    
    model_wake, model_duration, source = get_models(req.baby_id)
    model_version = get_model_version(source, req.baby_id)
    if model_needs_training(source):
        start_background_training(f"predict_sleep_source_{source}")

    # If no model is available or filtering removed too many records for confidence checks, fallback to EMA
    if not model_wake or not model_duration or len(X) < 2:
        intervals = [y for y in y_wake if y < 8 * 3600 * 1000] if 'y_wake' in locals() else []
        ema_interval = int(np.mean(intervals[-3:])) if len(intervals) >= 3 else (intervals[-1] if intervals else 2 * 3600 * 1000)
        next_sleep_start = clamp_next_sleep_time(last_sleep.end_time + ema_interval, req.current_time_ms)
        predicted_duration = clamp_predicted_duration(
            int(np.mean(y_duration[-3:])) if 'y_duration' in locals() and len(y_duration) >= 3 else 3600
        )
        response = PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=predicted_duration,
            predicted_duration_seconds=predicted_duration,
            confidence_score=0.6,
            source="ema"
        )
        record_prediction_audit(req, response)
        return response

    # Предикт для следующего сна
    X_next = extract_features_next(
        last_sleep=last_sleep.model_dump(),
        sleeps=sleeps_dicts,
        age_months=req.baby_age_months,
        feed_count=req.feed_count_24h,
        walk_duration=req.walk_duration_24h,
        is_sick=req.is_sick
    )
    
    predicted_wake_window = int(model_wake.predict(X_next)[0])
    predicted_duration = int(model_duration.predict(X_next)[0])
    
    # Sanity checks (bounds)
    if predicted_wake_window < 1800 * 1000: predicted_wake_window = 1800 * 1000
    if predicted_wake_window > 8 * 3600 * 1000: predicted_wake_window = 8 * 3600 * 1000
    predicted_duration = clamp_predicted_duration(predicted_duration)
    
    next_sleep_start = last_sleep.end_time + predicted_wake_window
    prediction_was_overdue = next_sleep_start < req.current_time_ms
    next_sleep_start = clamp_next_sleep_time(next_sleep_start, req.current_time_ms)
    
    # Расчет точности (Confidence Score) на основе Mean Absolute Error (MAE) по недавним снам
    predictions = model_wake.predict(X)
    mae = np.mean(np.abs(y_wake - predictions))
    
    # Нормализуем MAE в процент уверенности
    mae_seconds = mae / 1000
    confidence = 1.0 - (mae_seconds / 10800) # Штраф за ошибку
    
    # Бонус за персональную модель
    source_bonus = 0.05 if source == "personal" else 0.0
    
    final_confidence = float(np.clip(confidence + source_bonus, 0.4, 0.96))
    if prediction_was_overdue:
        final_confidence = min(final_confidence, 0.65)
    
    explanation_text = generate_explanation(
        age_months=req.baby_age_months,
        predicted_wake_window_sec=predicted_wake_window // 1000,
        predicted_duration_sec=predicted_duration,
        recent_sleeps=sleeps_dicts,
        feed_count=req.feed_count_24h,
        walk_duration=req.walk_duration_24h,
        is_sick=req.is_sick
    )
    
    response = PredictionResponse(
        next_sleep_time_ms=next_sleep_start,
        recommended_duration_seconds=predicted_duration,
        predicted_duration_seconds=predicted_duration,
        confidence_score=round(final_confidence, 2),
        source=source,
        model_version=model_version,
        explanation=explanation_text
    )
    record_prediction_audit(req, response)
    return response

@app.post("/evaluate_sleep_predictions", response_model=EvaluationResponse)
async def evaluate_sleep_predictions(
    req: EvaluationRequest,
    user_id: str = Depends(verify_jwt)
):
    await verify_baby_ownership(req.baby_id, user_id)
    result = evaluate_sleep_prediction_audits(
        baby_id=req.baby_id,
        lookback_days=req.lookback_days or 14,
        limit=req.limit or 50,
    )
    return EvaluationResponse(**result)

@app.post("/admin/train_global_model", response_model=TrainResponse)
def admin_train_global_model(_: bool = Depends(verify_cron_secret)):
    started = start_background_training("admin_endpoint", force=True)
    return TrainResponse(started=started, state=training_state_snapshot())

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model": "xgboost",
        "global_model": global_model_status(),
        "training": training_state_snapshot(),
    }

# Run with: uvicorn main:app --reload
