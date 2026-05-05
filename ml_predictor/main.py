from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from auth import verify_jwt, verify_baby_ownership
import xgboost as xgb
import math
from features import extract_features, extract_features_next
from model_store import get_models
from explanation import generate_explanation

app = FastAPI(title="BabySync ML Predictor (XGBoost)", version="2.0.0")

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
    confidence_score: float
    explanation: Optional[str] = None

# Features extraction moved to features.py

@app.post("/predict_sleep", response_model=PredictionResponse)
async def predict_next_sleep(
    req: PredictionRequest,
    user_id: str = Depends(verify_jwt)
):
    """
    Predics the next sleep time and duration using XGBoost on the fly
    """
    await verify_baby_ownership(req.baby_id, user_id)
    
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
            next_sleep_start = last_sleep.end_time + int(wake_window_hours * 3600 * 1000)
            rec_duration = 3600
        else:
            next_sleep_start = req.current_time_ms + 3600 * 1000
            rec_duration = 3600
        
        return PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=rec_duration,
            confidence_score=0.4 # Low confidence due to hardcoded rules
        )

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

    # If no model is available or filtering removed too many records for confidence checks, fallback to EMA
    if not model_wake or not model_duration or len(X) < 2:
        intervals = [y for y in y_wake if y < 8 * 3600 * 1000] if 'y_wake' in locals() else []
        ema_interval = int(np.mean(intervals[-3:])) if len(intervals) >= 3 else (intervals[-1] if intervals else 2 * 3600 * 1000)
        next_sleep_start = last_sleep.end_time + ema_interval
        predicted_duration = int(np.mean(y_duration[-3:])) if 'y_duration' in locals() and len(y_duration) >= 3 else 3600
        return PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=predicted_duration,
            confidence_score=0.6
        )

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
    if predicted_duration < 900: predicted_duration = 900
    
    next_sleep_start = last_sleep.end_time + predicted_wake_window
    
    # Расчет точности (Confidence Score) на основе Mean Absolute Error (MAE) по недавним снам
    predictions = model_wake.predict(X)
    mae = np.mean(np.abs(y_wake - predictions))
    
    # Нормализуем MAE в процент уверенности
    mae_seconds = mae / 1000
    confidence = 1.0 - (mae_seconds / 10800) # Штраф за ошибку
    
    # Бонус за персональную модель
    source_bonus = 0.05 if source == "personal" else 0.0
    
    final_confidence = float(np.clip(confidence + source_bonus, 0.4, 0.96))
    
    explanation_text = generate_explanation(
        age_months=req.baby_age_months,
        predicted_wake_window_sec=predicted_wake_window // 1000,
        predicted_duration_sec=predicted_duration,
        recent_sleeps=sleeps_dicts,
        feed_count=req.feed_count_24h,
        walk_duration=req.walk_duration_24h,
        is_sick=req.is_sick
    )
    
    return PredictionResponse(
        next_sleep_time_ms=next_sleep_start,
        recommended_duration_seconds=predicted_duration,
        confidence_score=round(final_confidence, 2),
        explanation=explanation_text
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "model": "xgboost"}

# Run with: uvicorn main:app --reload
