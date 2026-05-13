import numpy as np
import math
from typing import List, Tuple

def extract_features(sleeps: List[dict], age_months: float = 0.0, feed_count: int = 0, walk_duration: int = 0, is_sick: bool = False) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Creates the feature matrix X and target vectors y_wake, y_duration
    Extracts 13 features per sleep record context.
    """
    sorted_sleeps = sorted(sleeps, key=lambda x: x.get('start_time', 0))
    X = []
    y_wake = []
    y_duration = []
    
    # Calculate rolling averages
    durations = []
    wakes = []
    
    for i in range(1, len(sorted_sleeps)):
        prev_sleep = sorted_sleeps[i-1]
        curr_sleep = sorted_sleeps[i]
        
        wake_window = curr_sleep.get('start_time', 0) - prev_sleep.get('end_time', 0)
        
        if wake_window <= 0 or wake_window > 12 * 3600 * 1000:
            continue
            
        if prev_sleep.get('duration_seconds', 0) < 300:
            continue
            
        hour = (prev_sleep.get('end_time', 0) // 3600000) % 24
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)
        
        # Day of week from end_time timestamp
        import datetime
        dt = datetime.datetime.fromtimestamp(prev_sleep.get('end_time', 0) / 1000)
        dow = dt.weekday()
        dow_sin = math.sin(2 * math.pi * dow / 7)
        dow_cos = math.cos(2 * math.pi * dow / 7)
        
        durations.append(prev_sleep.get('duration_seconds', 0))
        if i > 1:
            wakes.append(sorted_sleeps[i-1].get('start_time', 0) - sorted_sleeps[i-2].get('end_time', 0))
        
        avg_dur = np.mean(durations[-3:]) if len(durations) > 0 else 0
        avg_wake = np.mean(wakes[-3:]) / 1000 if len(wakes) > 0 else 0
        
        features = [
            prev_sleep.get('duration_seconds', 0), # 1
            hour_sin,                              # 2
            hour_cos,                              # 3
            age_months,                            # 4
            1.0 if is_sick else 0.0,               # 5
            feed_count,                            # 6
            walk_duration,                         # 7
            dow_sin,                               # 8
            dow_cos,                               # 9
            prev_sleep.get('quality', 3),          # 10
            avg_dur,                               # 11
            avg_wake,                              # 12
            len(sorted_sleeps)                     # 13 (data density proxy)
        ]
        
        X.append(features)
        y_wake.append(wake_window)
        y_duration.append(curr_sleep.get('duration_seconds', 0))
        
    return np.array(X), np.array(y_wake), np.array(y_duration)

def extract_features_next(last_sleep: dict, sleeps: List[dict], age_months: float = 0.0, feed_count: int = 0, walk_duration: int = 0, is_sick: bool = False) -> np.ndarray:
    """
    Extracts features for the next prediction based on the last sleep and context.
    """
    sorted_sleeps = sorted(sleeps, key=lambda x: x.get('start_time', 0))

    hour = (last_sleep.get('end_time', 0) // 3600000) % 24
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)
    
    import datetime
    dt = datetime.datetime.fromtimestamp(last_sleep.get('end_time', 0) / 1000)
    dow = dt.weekday()
    dow_sin = math.sin(2 * math.pi * dow / 7)
    dow_cos = math.cos(2 * math.pi * dow / 7)
    
    durations = [s.get('duration_seconds', 0) for s in sorted_sleeps]
    wakes = []
    for i in range(1, len(sorted_sleeps)):
        w = sorted_sleeps[i].get('start_time', 0) - sorted_sleeps[i-1].get('end_time', 0)
        if 0 < w <= 12 * 3600 * 1000:
            wakes.append(w)
        
    avg_dur = np.mean(durations[-3:]) if len(durations) > 0 else 0
    avg_wake = np.mean(wakes[-3:]) / 1000 if len(wakes) > 0 else 0
    
    features = [
        last_sleep.get('duration_seconds', 0), # 1
        hour_sin,                              # 2
        hour_cos,                              # 3
        age_months,                            # 4
        1.0 if is_sick else 0.0,               # 5
        feed_count,                            # 6
        walk_duration,                         # 7
        dow_sin,                               # 8
        dow_cos,                               # 9
        last_sleep.get('quality', 3),          # 10
        avg_dur,                               # 11
        avg_wake,                              # 12
        len(sorted_sleeps)                     # 13
    ]
    
    return np.array([features])
