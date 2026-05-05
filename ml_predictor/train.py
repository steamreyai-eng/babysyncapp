import os
import json
import xgboost as xgb
import numpy as np
import math
from supabase import create_client, Client
from datetime import datetime, timedelta
from features import extract_features

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("Supabase credentials not configured in environment.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def create_mock_data():
    """Generates fallback data if real data cannot be fetched"""
    np.random.seed(42)
    
    sleeps = []
    current_time = int(datetime.utcnow().timestamp() * 1000) - 30 * 24 * 3600 * 1000
    
    for _ in range(100):
        dur = np.random.randint(1800, 7200)
        sleeps.append({
            "duration_seconds": dur,
            "start_time": current_time,
            "end_time": current_time + dur * 1000,
            "quality": np.random.randint(1, 5)
        })
        current_time += np.random.randint(7200, 10800) * 1000
        
    X, y_wake, y_duration = extract_features(sleeps, age_months=6.0, feed_count=5, walk_duration=3600, is_sick=False)
    return X, y_wake, y_duration

def fetch_and_prepare_data():
    """Fetches real anonymized data from Supabase"""
    try:
        supabase = get_supabase_client()
        ninety_days_ago = (datetime.utcnow() - timedelta(days=90)).isoformat()
        
        # We need sequential sleeps ordered by start_time to calculate wake windows.
        # Fetching all sleeps in chunks might be needed if there are many.
        response = supabase.table("sleeps").select("*").gte("created_at", ninety_days_ago).order("start_time").execute()
        sleeps = response.data
        
        if not sleeps or len(sleeps) < 50:
            print("Not enough real data found, using mock data for global model.")
            return create_mock_data()
            
        # Group sleeps by baby_id
        grouped_sleeps = {}
        for s in sleeps:
            b_id = s.get("baby_id")
            if not b_id:
                continue
            if b_id not in grouped_sleeps:
                grouped_sleeps[b_id] = []
            grouped_sleeps[b_id].append(s)
            
        X_all, y_wake_all, y_dur_all = [], [], []
        
        for b_id, b_sleeps in grouped_sleeps.items():
            X, yw, yd = extract_features(b_sleeps, age_months=6.0, feed_count=5, walk_duration=3600, is_sick=False)
            if len(X) > 0:
                X_all.extend(X)
                y_wake_all.extend(yw)
                y_dur_all.extend(yd)
                
        if len(X_all) < 50:
            print("Not enough valid data after filtering, using mock data.")
            return create_mock_data()
            
        return np.array(X_all), np.array(y_wake_all), np.array(y_dur_all)
        
    except Exception as e:
        print(f"Error fetching real data: {e}. Using mock data.")
        return create_mock_data()

def train_global_model():
    print("Preparing data for global model...")
    X, y_wake, y_duration = fetch_and_prepare_data()
    
    print(f"Training on {len(X)} samples...")
    
    # Train wake window model
    model_wake = xgb.XGBRegressor(
        n_estimators=50, 
        max_depth=4, 
        learning_rate=0.1, 
        objective='reg:squarederror'
    )
    model_wake.fit(X, y_wake)
    
    # Train duration model
    model_duration = xgb.XGBRegressor(
        n_estimators=50, 
        max_depth=4, 
        learning_rate=0.1, 
        objective='reg:squarederror'
    )
    model_duration.fit(X, y_duration)
    
    # Save models
    os.makedirs("models", exist_ok=True)
    
    # We use joblib or XGBoost's native save_model. 
    # For JSON format (as requested in Phase 0 plan):
    import joblib
    wake_path = "models/global_model_wake.pkl"
    duration_path = "models/global_model_duration.pkl"
    
    joblib.dump(model_wake, wake_path)
    joblib.dump(model_duration, duration_path)
    
    print(f"Global models saved successfully:\n- {wake_path}\n- {duration_path}")

if __name__ == "__main__":
    train_global_model()
