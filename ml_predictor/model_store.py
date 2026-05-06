import json
import os
import time
from datetime import datetime

import joblib

from storage import download_file, download_json, storage_enabled

DEFAULT_MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
MODELS_DIR = os.environ.get("MODELS_DIR", DEFAULT_MODELS_DIR)
try:
    MODEL_STORAGE_SYNC_INTERVAL_SECONDS = int(os.environ.get("MODEL_STORAGE_SYNC_INTERVAL_SECONDS", "300"))
except ValueError:
    MODEL_STORAGE_SYNC_INTERVAL_SECONDS = 300
os.makedirs(MODELS_DIR, exist_ok=True)

_last_storage_sync_at = 0.0


def _get_path(baby_id: str, target: str) -> str:
    return os.path.join(MODELS_DIR, f"{baby_id}_{target}.pkl")


def _global_path(name: str) -> str:
    return os.path.join(MODELS_DIR, name)


def _json_load(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Could not load {path}: {e}")
        return {}


def has_global_model() -> bool:
    return (
        os.path.exists(_global_path("global_model_wake.pkl"))
        and os.path.exists(_global_path("global_model_duration.pkl"))
    )


def load_global_metadata() -> dict:
    return _json_load(_global_path("global_model_metadata.json"))


def sync_global_model_from_storage(force: bool = False) -> bool:
    """
    Pulls the approved global model from Supabase Storage when newer or missing.
    Safe to call often; throttled by MODEL_STORAGE_SYNC_INTERVAL_SECONDS.
    """
    global _last_storage_sync_at

    if not storage_enabled():
        return False

    now = time.time()
    if not force and now - _last_storage_sync_at < MODEL_STORAGE_SYNC_INTERVAL_SECONDS and has_global_model():
        return False

    _last_storage_sync_at = now
    remote_metadata = download_json("global_model_metadata.json")
    if not remote_metadata:
        return False

    local_metadata = load_global_metadata()
    remote_version = remote_metadata.get("model_version")
    local_version = local_metadata.get("model_version")
    needs_download = force or not has_global_model() or remote_version != local_version
    if not needs_download:
        return False

    downloaded_wake = download_file("global_model_wake.pkl", _global_path("global_model_wake.pkl"))
    downloaded_duration = download_file("global_model_duration.pkl", _global_path("global_model_duration.pkl"))
    if not downloaded_wake or not downloaded_duration:
        return False

    metadata_path = _global_path("global_model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(remote_metadata, f, ensure_ascii=True, indent=2)

    download_file("global_model_metrics.json", _global_path("global_model_metrics.json"))
    return True


def load_global_model(target: str):
    sync_global_model_from_storage()
    path = _global_path(f"global_model_{target}.pkl")
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


def get_model_version(source: str, baby_id: str | None = None):
    """
    Returns a stable-ish model version for audit/debug output.
    Falls back to file modification time for older models without metadata.
    """
    if source == "personal" and baby_id:
        paths = [_get_path(baby_id, "wake"), _get_path(baby_id, "duration")]
    elif source == "global":
        metadata = load_global_metadata()
        if metadata.get("model_version"):
            return metadata["model_version"]
        paths = [
            _global_path("global_model_wake.pkl"),
            _global_path("global_model_duration.pkl"),
        ]
    else:
        return None

    existing_paths = [path for path in paths if os.path.exists(path)]
    if not existing_paths:
        return None

    mtime = max(os.path.getmtime(path) for path in existing_paths)
    return datetime.utcfromtimestamp(mtime).replace(microsecond=0).isoformat() + "Z"


def global_model_status() -> dict:
    metadata = load_global_metadata()
    return {
        "available": has_global_model(),
        "model_version": metadata.get("model_version"),
        "trained_at": metadata.get("trained_at"),
        "storage_enabled": storage_enabled(),
    }
