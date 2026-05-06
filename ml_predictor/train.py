import json
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import joblib
import numpy as np
import xgboost as xgb
from supabase import Client, create_client

from features import extract_features
from storage import object_path, upload_file, upload_global_artifacts

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ALLOW_MOCK_TRAINING = os.environ.get("ALLOW_MOCK_TRAINING", "").lower() in {"1", "true", "yes"}
DEFAULT_MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
MODELS_DIR = os.environ.get("MODELS_DIR", DEFAULT_MODELS_DIR)


def read_int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def read_float_env(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except ValueError:
        return default


MIN_REAL_SAMPLES = read_int_env("MIN_REAL_TRAINING_SAMPLES", 50)
TRAINING_LOOKBACK_DAYS = read_int_env("TRAINING_LOOKBACK_DAYS", 180)
VALIDATION_FRACTION = min(max(read_float_env("VALIDATION_FRACTION", 0.2), 0.05), 0.4)
MIN_VALIDATION_SAMPLES = read_int_env("MIN_VALIDATION_SAMPLES", 10)
MODEL_ACCEPTANCE_TOLERANCE = read_float_env("MODEL_ACCEPTANCE_TOLERANCE", 0.0)


class MockTrainingDisabled(RuntimeError):
    pass


def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("Supabase credentials not configured in environment.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _to_ms(value: Any) -> int | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        if value > 100000000000:
            return int(value)
        if value > 1000000000:
            return int(value * 1000)
        return None

    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            return _to_ms(int(stripped))
        try:
            dt = datetime.fromisoformat(stripped.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None

    return None


def _from_ms(value: int) -> str:
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _make_model() -> xgb.XGBRegressor:
    return xgb.XGBRegressor(
        n_estimators=80,
        max_depth=4,
        learning_rate=0.08,
        objective="reg:squarederror",
        random_state=42,
    )


def create_mock_data():
    """Generates fallback data for local/dev training only."""
    np.random.seed(42)

    sleeps = []
    current_time = int(datetime.now(timezone.utc).timestamp() * 1000) - 30 * 24 * 3600 * 1000

    for _ in range(100):
        duration = np.random.randint(1800, 7200)
        sleeps.append({
            "duration_seconds": duration,
            "start_time": current_time,
            "end_time": current_time + duration * 1000,
            "quality": np.random.randint(1, 5),
        })
        current_time += np.random.randint(7200, 10800) * 1000

    X, y_wake, y_duration = extract_features(
        sleeps,
        age_months=6.0,
        feed_count=5,
        walk_duration=3600,
        is_sick=False,
    )
    feature_times = np.arange(len(X))
    summary = {
        "data_source": "mock",
        "sleep_rows": len(sleeps),
        "training_rows": int(len(X)),
        "babies_with_training_rows": 1,
        "missing_birthdate_rows": 0,
        "context_tables": {
            "feedings": 0,
            "walks": 0,
            "health_logs": 0,
        },
    }
    return X, y_wake, y_duration, feature_times, summary


def maybe_create_mock_data(reason: str):
    if not ALLOW_MOCK_TRAINING:
        raise MockTrainingDisabled(
            f"{reason}. Refusing to train the production global model on mock data. "
            "Set ALLOW_MOCK_TRAINING=1 only for local/dev training."
        )

    print(f"{reason}. ALLOW_MOCK_TRAINING=1, using mock data.")
    return create_mock_data()


def fetch_table(supabase: Client, table: str, columns: str, since_iso: str | None = None) -> list[dict]:
    page_size = 1000
    offset = 0
    rows: list[dict] = []

    while True:
        query = supabase.table(table).select(columns)
        if since_iso:
            query = query.gte("created_at", since_iso)
        response = query.range(offset, offset + page_size - 1).execute()
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size:
            return rows
        offset += page_size


def fetch_optional_table(
    supabase: Client,
    table: str,
    columns: str,
    since_iso: str | None = None,
) -> list[dict]:
    try:
        return fetch_table(supabase, table, columns, since_iso)
    except Exception as e:
        print(f"Skipping optional context table {table}: {e}")
        return []


def fetch_profiles(supabase: Client) -> dict[str, dict]:
    try:
        profiles = fetch_table(supabase, "baby_profile", "id,baby_id,birthdate")
    except Exception as e:
        print(f"Could not fetch baby_profile.baby_id, retrying without it: {e}")
        profiles = fetch_optional_table(supabase, "baby_profile", "id,birthdate")

    profile_by_baby_id: dict[str, dict] = {}
    for profile in profiles:
        if profile.get("baby_id"):
            profile_by_baby_id[str(profile["baby_id"])] = profile
        if profile.get("id"):
            profile_by_baby_id[str(profile["id"])] = profile
    return profile_by_baby_id


def normalize_sleep(row: dict) -> dict | None:
    start_ms = _to_ms(row.get("start_time")) or _to_ms(row.get("created_at"))
    duration = _safe_int(row.get("duration_seconds"))
    end_ms = _to_ms(row.get("end_time"))

    if start_ms is None or duration <= 0:
        return None
    if end_ms is None:
        end_ms = start_ms + duration * 1000

    baby_id = row.get("baby_id")
    if not baby_id:
        return None

    return {
        "id": row.get("id"),
        "baby_id": str(baby_id),
        "duration_seconds": duration,
        "start_time": start_ms,
        "end_time": end_ms,
        "quality": _safe_int(row.get("quality"), 3),
    }


def normalize_event(row: dict, needs_duration: bool = False) -> dict | None:
    baby_id = row.get("baby_id")
    created_ms = _to_ms(row.get("created_at"))
    if not baby_id or created_ms is None:
        return None

    normalized = {
        "baby_id": str(baby_id),
        "created_at": created_ms,
    }
    if needs_duration:
        normalized["duration_seconds"] = _safe_int(row.get("duration_seconds"))
    if "is_sick" in row:
        normalized["is_sick"] = bool(row.get("is_sick"))
    return normalized


def age_months_at(profile: dict | None, at_ms: int) -> float:
    if not profile:
        return 0.0

    birth_ms = _to_ms(profile.get("birthdate"))
    if birth_ms is None:
        return 0.0

    return max(0.0, (at_ms - birth_ms) / (30.44 * 24 * 3600 * 1000))


def events_in_window(events: list[dict], baby_id: str, start_ms: int, end_ms: int) -> list[dict]:
    return [
        event
        for event in events
        if event["baby_id"] == baby_id and start_ms <= event["created_at"] <= end_ms
    ]


def make_feature_row(
    prev_sleep: dict,
    sorted_sleeps: list[dict],
    sleep_index: int,
    age_months: float,
    feed_count: int,
    walk_duration: int,
    is_sick: bool,
) -> list[float]:
    hour = (prev_sleep["end_time"] // 3600000) % 24
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)

    dt = datetime.fromtimestamp(prev_sleep["end_time"] / 1000, tz=timezone.utc)
    dow = dt.weekday()
    dow_sin = math.sin(2 * math.pi * dow / 7)
    dow_cos = math.cos(2 * math.pi * dow / 7)

    prior_sleeps = sorted_sleeps[:sleep_index]
    durations = [sleep["duration_seconds"] for sleep in prior_sleeps]
    wakes = [
        prior_sleeps[i]["start_time"] - prior_sleeps[i - 1]["end_time"]
        for i in range(1, len(prior_sleeps))
        if 0 < prior_sleeps[i]["start_time"] - prior_sleeps[i - 1]["end_time"] <= 12 * 3600 * 1000
    ]
    avg_dur = float(np.mean(durations[-3:])) if durations else 0.0
    avg_wake = float(np.mean(wakes[-3:]) / 1000) if wakes else 0.0

    return [
        prev_sleep["duration_seconds"],
        hour_sin,
        hour_cos,
        age_months,
        1.0 if is_sick else 0.0,
        feed_count,
        walk_duration,
        dow_sin,
        dow_cos,
        prev_sleep.get("quality", 3),
        avg_dur,
        avg_wake,
        len(sorted_sleeps),
    ]


def build_training_dataset(
    sleeps: list[dict],
    profiles_by_baby_id: dict[str, dict],
    feedings: list[dict],
    walks: list[dict],
    health_logs: list[dict],
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, dict]:
    grouped_sleeps: dict[str, list[dict]] = {}
    for row in sleeps:
        sleep = normalize_sleep(row)
        if not sleep:
            continue
        grouped_sleeps.setdefault(sleep["baby_id"], []).append(sleep)

    normalized_feedings = [
        event for event in (normalize_event(row) for row in feedings) if event is not None
    ]
    normalized_walks = [
        event for event in (normalize_event(row, needs_duration=True) for row in walks) if event is not None
    ]
    normalized_health_logs = [
        event for event in (normalize_event(row) for row in health_logs) if event is not None
    ]

    X_all, y_wake_all, y_duration_all, feature_times = [], [], [], []
    missing_birthdate_rows = 0
    baby_ids_with_training_rows = set()

    for baby_id, baby_sleeps in grouped_sleeps.items():
        sorted_sleeps = sorted(baby_sleeps, key=lambda x: x["start_time"])
        if len(sorted_sleeps) < 2:
            continue

        profile = profiles_by_baby_id.get(baby_id)
        for i in range(1, len(sorted_sleeps)):
            prev_sleep = sorted_sleeps[i - 1]
            curr_sleep = sorted_sleeps[i]
            wake_window = curr_sleep["start_time"] - prev_sleep["end_time"]

            if wake_window <= 0 or wake_window > 12 * 3600 * 1000:
                continue
            if prev_sleep["duration_seconds"] < 300:
                continue

            context_end_ms = prev_sleep["end_time"]
            context_start_ms = context_end_ms - 24 * 3600 * 1000
            feed_count = len(events_in_window(normalized_feedings, baby_id, context_start_ms, context_end_ms))
            recent_walks = events_in_window(normalized_walks, baby_id, context_start_ms, context_end_ms)
            walk_duration = sum(walk.get("duration_seconds", 0) for walk in recent_walks)
            recent_health = events_in_window(normalized_health_logs, baby_id, context_start_ms, context_end_ms)
            is_sick = any(health.get("is_sick") for health in recent_health)
            age_months = age_months_at(profile, context_end_ms)

            if not profile or _to_ms(profile.get("birthdate")) is None:
                missing_birthdate_rows += 1

            X_all.append(make_feature_row(
                prev_sleep=prev_sleep,
                sorted_sleeps=sorted_sleeps,
                sleep_index=i,
                age_months=age_months,
                feed_count=feed_count,
                walk_duration=walk_duration,
                is_sick=is_sick,
            ))
            y_wake_all.append(wake_window)
            y_duration_all.append(curr_sleep["duration_seconds"])
            feature_times.append(context_end_ms)
            baby_ids_with_training_rows.add(baby_id)

    summary = {
        "data_source": "supabase",
        "sleep_rows": len(sleeps),
        "training_rows": len(X_all),
        "babies_seen": len(grouped_sleeps),
        "babies_with_training_rows": len(baby_ids_with_training_rows),
        "missing_birthdate_rows": missing_birthdate_rows,
        "context_tables": {
            "feedings": len(normalized_feedings),
            "walks": len(normalized_walks),
            "health_logs": len(normalized_health_logs),
        },
    }

    return (
        np.array(X_all),
        np.array(y_wake_all),
        np.array(y_duration_all),
        np.array(feature_times),
        summary,
    )


def fetch_and_prepare_data():
    """Fetches real anonymized training data from Supabase."""
    try:
        supabase = get_supabase_client()
        since = datetime.now(timezone.utc) - timedelta(days=TRAINING_LOOKBACK_DAYS)
        context_since = since - timedelta(days=1)
        since_iso = since.isoformat()
        context_since_iso = context_since.isoformat()

        sleeps = fetch_table(
            supabase,
            "sleeps",
            "id,baby_id,duration_seconds,start_time,end_time,quality,created_at",
            since_iso,
        )
        if not sleeps or len(sleeps) < MIN_REAL_SAMPLES:
            return maybe_create_mock_data("Not enough real sleep rows found")

        profiles_by_baby_id = fetch_profiles(supabase)
        feedings = fetch_optional_table(supabase, "feedings", "baby_id,created_at", context_since_iso)
        walks = fetch_optional_table(supabase, "walks", "baby_id,created_at,duration_seconds", context_since_iso)
        health_logs = fetch_optional_table(supabase, "health_logs", "baby_id,created_at,is_sick", context_since_iso)

        X, y_wake, y_duration, feature_times, summary = build_training_dataset(
            sleeps=sleeps,
            profiles_by_baby_id=profiles_by_baby_id,
            feedings=feedings,
            walks=walks,
            health_logs=health_logs,
        )

        if len(X) < MIN_REAL_SAMPLES:
            return maybe_create_mock_data("Not enough valid training samples after filtering")

        return X, y_wake, y_duration, feature_times, summary

    except MockTrainingDisabled:
        raise
    except Exception as e:
        return maybe_create_mock_data(f"Error fetching real training data: {e}")


def split_train_validation(
    X: np.ndarray,
    y_wake: np.ndarray,
    y_duration: np.ndarray,
    feature_times: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    order = np.argsort(feature_times)
    X = X[order]
    y_wake = y_wake[order]
    y_duration = y_duration[order]

    validation_size = max(MIN_VALIDATION_SAMPLES, int(len(X) * VALIDATION_FRACTION))
    validation_size = min(validation_size, len(X) - 1)
    if validation_size < 1:
        raise RuntimeError("Not enough data for validation split.")

    split_index = len(X) - validation_size
    return (
        X[:split_index],
        X[split_index:],
        y_wake[:split_index],
        y_wake[split_index:],
        y_duration[:split_index],
        y_duration[split_index:],
    )


def train_pair(X: np.ndarray, y_wake: np.ndarray, y_duration: np.ndarray):
    model_wake = _make_model()
    model_wake.fit(X, y_wake)

    model_duration = _make_model()
    model_duration.fit(X, y_duration)

    return model_wake, model_duration


def evaluate_pair(model_wake, model_duration, X: np.ndarray, y_wake: np.ndarray, y_duration: np.ndarray) -> dict:
    wake_predictions = model_wake.predict(X)
    duration_predictions = model_duration.predict(X)

    wake_errors_seconds = (y_wake - wake_predictions) / 1000
    duration_errors_seconds = y_duration - duration_predictions

    return {
        "wake_mae_seconds": round(float(np.mean(np.abs(wake_errors_seconds))), 2),
        "wake_rmse_seconds": round(float(np.sqrt(np.mean(np.square(wake_errors_seconds)))), 2),
        "duration_mae_seconds": round(float(np.mean(np.abs(duration_errors_seconds))), 2),
        "duration_rmse_seconds": round(float(np.sqrt(np.mean(np.square(duration_errors_seconds)))), 2),
    }


def combined_score(metrics: dict) -> float:
    return float(metrics["wake_mae_seconds"]) + float(metrics["duration_mae_seconds"])


def load_existing_global_models():
    wake_path = os.path.join(MODELS_DIR, "global_model_wake.pkl")
    duration_path = os.path.join(MODELS_DIR, "global_model_duration.pkl")
    if not os.path.exists(wake_path) or not os.path.exists(duration_path):
        return None, None
    return joblib.load(wake_path), joblib.load(duration_path)


def atomic_joblib_dump(model, path: str):
    tmp_path = f"{path}.tmp"
    joblib.dump(model, tmp_path)
    os.replace(tmp_path, path)


def atomic_json_dump(payload: dict, path: str):
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=True, indent=2)
    os.replace(tmp_path, path)


def should_accept_candidate(candidate_metrics: dict, existing_metrics: dict | None) -> tuple[bool, str]:
    candidate_score = combined_score(candidate_metrics)
    if not np.isfinite(candidate_score):
        return False, "candidate_metrics_not_finite"

    if existing_metrics is None:
        return True, "no_existing_model"

    existing_score = combined_score(existing_metrics)
    if not np.isfinite(existing_score):
        return True, "existing_model_metrics_not_finite"

    allowed_score = existing_score * (1 + MODEL_ACCEPTANCE_TOLERANCE)
    if candidate_score < allowed_score:
        return True, "candidate_improved_validation_score"

    return False, "candidate_did_not_improve_validation_score"


def train_global_model():
    print("Preparing data for global model...")
    X, y_wake, y_duration, feature_times, data_summary = fetch_and_prepare_data()
    print(f"Training rows: {len(X)} from {data_summary['data_source']}")

    X_train, X_val, y_wake_train, y_wake_val, y_duration_train, y_duration_val = split_train_validation(
        X,
        y_wake,
        y_duration,
        feature_times,
    )
    print(f"Train split: {len(X_train)} rows, validation split: {len(X_val)} rows")

    candidate_wake, candidate_duration = train_pair(X_train, y_wake_train, y_duration_train)
    candidate_train_metrics = evaluate_pair(candidate_wake, candidate_duration, X_train, y_wake_train, y_duration_train)
    candidate_validation_metrics = evaluate_pair(candidate_wake, candidate_duration, X_val, y_wake_val, y_duration_val)

    existing_validation_metrics = None
    existing_wake, existing_duration = load_existing_global_models()
    if existing_wake is not None and existing_duration is not None:
        try:
            existing_validation_metrics = evaluate_pair(
                existing_wake,
                existing_duration,
                X_val,
                y_wake_val,
                y_duration_val,
            )
        except Exception as e:
            print(f"Could not evaluate existing global model: {e}")

    accepted, acceptance_reason = should_accept_candidate(
        candidate_validation_metrics,
        existing_validation_metrics,
    )

    trained_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    model_version = trained_at.replace("-", "").replace(":", "")
    metrics_payload = {
        "model_version": model_version,
        "trained_at": trained_at,
        "accepted": accepted,
        "acceptance_reason": acceptance_reason,
        "data_summary": data_summary,
        "training_config": {
            "min_real_training_samples": MIN_REAL_SAMPLES,
            "training_lookback_days": TRAINING_LOOKBACK_DAYS,
            "validation_fraction": VALIDATION_FRACTION,
            "min_validation_samples": MIN_VALIDATION_SAMPLES,
            "model_acceptance_tolerance": MODEL_ACCEPTANCE_TOLERANCE,
        },
        "splits": {
            "train_rows": int(len(X_train)),
            "validation_rows": int(len(X_val)),
            "feature_count": int(X.shape[1]) if len(X.shape) > 1 else 0,
        },
        "candidate": {
            "train": candidate_train_metrics,
            "validation": candidate_validation_metrics,
            "combined_validation_score": round(combined_score(candidate_validation_metrics), 2),
        },
        "existing": {
            "validation": existing_validation_metrics,
            "combined_validation_score": (
                round(combined_score(existing_validation_metrics), 2)
                if existing_validation_metrics
                else None
            ),
        },
    }

    os.makedirs(MODELS_DIR, exist_ok=True)
    last_metrics_path = os.path.join(MODELS_DIR, "global_model_last_training_metrics.json")
    atomic_json_dump(metrics_payload, last_metrics_path)
    upload_file(last_metrics_path, object_path("global_model_last_training_metrics.json"))

    if not accepted:
        print(f"Candidate rejected: {acceptance_reason}")
        print(f"Last training metrics saved to {last_metrics_path}")
        return metrics_payload

    final_wake, final_duration = train_pair(X, y_wake, y_duration)
    wake_path = os.path.join(MODELS_DIR, "global_model_wake.pkl")
    duration_path = os.path.join(MODELS_DIR, "global_model_duration.pkl")
    metrics_path = os.path.join(MODELS_DIR, "global_model_metrics.json")
    metadata_path = os.path.join(MODELS_DIR, "global_model_metadata.json")

    atomic_joblib_dump(final_wake, wake_path)
    atomic_joblib_dump(final_duration, duration_path)

    metadata = {
        "model_version": model_version,
        "trained_at": trained_at,
        "data_source": data_summary["data_source"],
        "sample_count": int(len(X)),
        "feature_count": int(X.shape[1]) if len(X.shape) > 1 else 0,
        "wake_validation_mae_seconds": candidate_validation_metrics["wake_mae_seconds"],
        "duration_validation_mae_seconds": candidate_validation_metrics["duration_mae_seconds"],
        "combined_validation_score": round(combined_score(candidate_validation_metrics), 2),
        "acceptance_reason": acceptance_reason,
    }
    atomic_json_dump(metrics_payload, metrics_path)
    atomic_json_dump(metadata, metadata_path)
    uploaded = upload_global_artifacts(MODELS_DIR)

    print("Global model accepted and saved successfully:")
    print(f"- {wake_path}")
    print(f"- {duration_path}")
    print(f"- {metrics_path}")
    print(f"- {metadata_path}")
    if uploaded:
        print(f"Uploaded model artifacts to Supabase Storage: {', '.join(uploaded)}")
    return metrics_payload


if __name__ == "__main__":
    train_global_model()
