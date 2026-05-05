import os
import joblib

MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

def _get_path(baby_id: str, target: str) -> str:
    return os.path.join(MODELS_DIR, f"{baby_id}_{target}.pkl")

def load_global_model(target: str):
    path = os.path.join(MODELS_DIR, f"global_model_{target}.pkl")
    if not os.path.exists(path):
        return None
    return joblib.load(path)

def load_personal_model(baby_id: str, target: str):
    path = _get_path(baby_id, target)
    if not os.path.exists(path):
        return load_global_model(target)
    return joblib.load(path)

def save_personal_model(baby_id: str, target: str, model):
    path = _get_path(baby_id, target)
    joblib.dump(model, path)

def get_models(baby_id: str):
    """
    Returns (model_wake, model_duration, prediction_source)
    """
    personal_wake_path = _get_path(baby_id, "wake")
    personal_duration_path = _get_path(baby_id, "duration")
    
    if os.path.exists(personal_wake_path) and os.path.exists(personal_duration_path):
        model_wake = joblib.load(personal_wake_path)
        model_duration = joblib.load(personal_duration_path)
        
        return model_wake, model_duration, "personal"
    
    global_wake = load_global_model("wake")
    global_duration = load_global_model("duration")
    
    if global_wake and global_duration:
        return global_wake, global_duration, "global"
        
    return None, None, "ema"
