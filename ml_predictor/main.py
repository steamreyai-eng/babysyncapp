from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import xgboost as xgb
import math

app = FastAPI(title="BabySync ML Predictor (XGBoost)", version="2.0.0")

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

def extract_features(sleeps: List[SleepRecord]):
    """
    Создает набор данных для обучения (X, y_wake, y_duration)
    """
    sorted_sleeps = sorted(sleeps, key=lambda x: x.start_time)
    X = []
    y_wake = []
    y_duration = []
    
    for i in range(1, len(sorted_sleeps)):
        prev_sleep = sorted_sleeps[i-1]
        curr_sleep = sorted_sleeps[i]
        
        wake_window = curr_sleep.start_time - prev_sleep.end_time
        
        # Фильтруем ночные сны (если бодрствование больше 12 часов, скорее всего это пропущенные данные)
        if wake_window <= 0 or wake_window > 12 * 3600 * 1000:
            continue
            
        # Фильтруем аномально короткие сны (< 5 минут)
        if prev_sleep.duration_seconds < 300:
            continue
            
        # Признаки (Features):
        # 1. Продолжительность предыдущего сна
        # 2. Час окончания предыдущего сна (циклические признаки sin/cos)
        hour = (prev_sleep.end_time // 3600000) % 24
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)
        
        X.append([prev_sleep.duration_seconds, hour_sin, hour_cos])
        y_wake.append(wake_window)
        y_duration.append(curr_sleep.duration_seconds)
        
    return np.array(X), np.array(y_wake), np.array(y_duration)

@app.post("/predict_sleep", response_model=PredictionResponse)
async def predict_next_sleep(req: PredictionRequest):
    """
    Predics the next sleep time and duration using XGBoost on the fly
    """
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

    # ML Mode: XGBoost Training on the fly
    X, y_wake, y_duration = extract_features(req.recent_sleeps)
    
    # If filtering removed too many records, fallback to EMA
    if len(X) < 5:
        intervals = [y for y in y_wake if y < 8 * 3600 * 1000]
        ema_interval = int(np.mean(intervals[-3:])) if len(intervals) >= 3 else (intervals[-1] if intervals else 2 * 3600 * 1000)
        next_sleep_start = last_sleep.end_time + ema_interval
        predicted_duration = int(np.mean(y_duration[-3:])) if len(y_duration) >= 3 else 3600
        return PredictionResponse(
            next_sleep_time_ms=next_sleep_start,
            recommended_duration_seconds=predicted_duration,
            confidence_score=0.6
        )

    # Обучаем модель для времени бодрствования
    model_wake = xgb.XGBRegressor(
        n_estimators=10, 
        max_depth=3, 
        learning_rate=0.1, 
        objective='reg:squarederror'
    )
    model_wake.fit(X, y_wake)
    
    # Обучаем модель для длительности сна
    model_duration = xgb.XGBRegressor(
        n_estimators=10, 
        max_depth=3, 
        learning_rate=0.1, 
        objective='reg:squarederror'
    )
    model_duration.fit(X, y_duration)
    
    # Предикт для следующего сна
    hour = (last_sleep.end_time // 3600000) % 24
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)
    X_next = np.array([[last_sleep.duration_seconds, hour_sin, hour_cos]])
    
    predicted_wake_window = int(model_wake.predict(X_next)[0])
    predicted_duration = int(model_duration.predict(X_next)[0])
    
    # Sanity checks (bounds)
    if predicted_wake_window < 1800 * 1000: predicted_wake_window = 1800 * 1000
    if predicted_wake_window > 8 * 3600 * 1000: predicted_wake_window = 8 * 3600 * 1000
    if predicted_duration < 900: predicted_duration = 900
    
    next_sleep_start = last_sleep.end_time + predicted_wake_window
    
    # Расчет точности (Confidence Score) на основе Mean Absolute Error (MAE)
    predictions = model_wake.predict(X)
    mae = np.mean(np.abs(y_wake - predictions))
    
    # Нормализуем MAE в процент уверенности
    # Если средняя ошибка < 30 минут (1800с), уверенность 95%
    # Если средняя ошибка > 2 часов (7200с), уверенность 50%
    mae_seconds = mae / 1000
    confidence = 1.0 - (mae_seconds / 10800) # Штраф за ошибку
    
    # Бонус за количество данных (больше данных = больше уверенность)
    data_bonus = min(0.1, len(X) * 0.005)
    
    final_confidence = float(np.clip(confidence + data_bonus, 0.4, 0.96))
    
    return PredictionResponse(
        next_sleep_time_ms=next_sleep_start,
        recommended_duration_seconds=predicted_duration,
        confidence_score=round(final_confidence, 2)
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "model": "xgboost"}

# Run with: uvicorn main:app --reload
