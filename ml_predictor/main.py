from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

# Псевдо-импорт для XGBoost, будет заменен на реальный при деплое
# import xgboost as xgb

app = FastAPI(title="BabySync ML Predictor", version="1.0.0")

class SleepRecord(BaseModel):
    duration_seconds: int
    start_time: int
    end_time: int
    quality: int

class PredictionRequest(BaseModel):
    baby_age_months: float
    recent_sleeps: List[SleepRecord]
    current_time_ms: int

class PredictionResponse(BaseModel):
    next_sleep_time_ms: int
    recommended_duration_seconds: int
    confidence_score: float

@app.post("/predict_sleep", response_model=PredictionResponse)
async def predict_next_sleep(req: PredictionRequest):
    """
    Predics the next sleep time and duration using a hybrid approach
    (Rule-based fallback for low data + ML algorithm for high data).
    """
    if len(req.recent_sleeps) < 5:
        # Fallback 1: Rule-based (Wake Windows)
        wake_window_hours = 2.0
        if req.baby_age_months < 1: wake_window_hours = 1.0
        elif req.baby_age_months < 3: wake_window_hours = 1.5
        elif req.baby_age_months < 6: wake_window_hours = 2.0
        elif req.baby_age_months < 9: wake_window_hours = 2.5
        elif req.baby_age_months < 12: wake_window_hours = 3.0
        else: wake_window_hours = 4.0

        last_sleep = max(req.recent_sleeps, key=lambda x: x.end_time) if req.recent_sleeps else None
        
        if last_sleep:
            next_sleep_start = last_sleep.end_time + int(wake_window_hours * 3600 * 1000)
            rec_duration = 3600 # default 1 hour
        else:
            # No data at all, assume sleeping in 1 hour
            next_sleep_start = req.current_time_ms + 3600 * 1000
            rec_duration = 3600
        
        return PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=rec_duration,
            confidence_score=0.4 # Low confidence due to hardcoded rules
        )

    # Fallback 2: EMA / Mock ML Model (XGBoost placeholder)
    # ЗДЕСЬ ДОЛЖНА БЫТЬ ЛОГИКА XGBOOST! Для MVP используем среднюю продолжительность.
    # durations = [s.duration_seconds for s in req.recent_sleeps]
    # avg_duration = int(np.mean(durations))
    
    # Calculate intervals between sleeps
    intervals = []
    sorted_sleeps = sorted(req.recent_sleeps, key=lambda x: x.start_time)
    for i in range(1, len(sorted_sleeps)):
        interval = sorted_sleeps[i].start_time - sorted_sleeps[i-1].end_time
        if 0 < interval < 8 * 3600 * 1000: # Filter out night sleeps (super long intervals)
            intervals.append(interval)

    if not intervals:
        intervals = [2 * 3600 * 1000] # 2 hours default
        
    # Exponential moving average of wake windows
    ema_interval = int(np.mean(intervals[-3:])) if len(intervals) >= 3 else intervals[-1]
    
    last_sleep = sorted_sleeps[-1]
    next_sleep_start = last_sleep.end_time + ema_interval
    
    # Simple duration prediction
    durations = [s.duration_seconds for s in sorted_sleeps]
    predicted_duration = int(np.mean(durations[-3:]))
    
    return PredictionResponse(
        next_sleep_time_ms=next_sleep_start,
        recommended_duration_seconds=predicted_duration,
        confidence_score=0.85 # High confidence due to data
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Run with: uvicorn main:app --reload
