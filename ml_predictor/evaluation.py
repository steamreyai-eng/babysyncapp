from datetime import datetime, timedelta, timezone
from typing import Any

from auth import get_supabase_client


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


def evaluate_sleep_prediction_audits(
    baby_id: str,
    lookback_days: int = 14,
    limit: int = 50,
) -> dict:
    """
    Compares pending prediction audit rows with the first real sleep logged after each request.
    Returns counters only; individual audit rows stay in Supabase.
    """
    if not baby_id:
        return {"evaluated_count": 0, "pending_count": 0}

    lookback_days = max(1, min(lookback_days, 90))
    limit = max(1, min(limit, 200))
    supabase = get_supabase_client()
    created_after = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).isoformat()

    audits_response = (
        supabase.table("sleep_predictions_audit")
        .select("*")
        .eq("baby_id", baby_id)
        .is_("evaluated_at", "null")
        .gte("created_at", created_after)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    audits = audits_response.data or []
    if not audits:
        return {"evaluated_count": 0, "pending_count": 0}

    anchors = [
        audit.get("request_time_ms") or _to_ms(audit.get("created_at"))
        for audit in audits
    ]
    anchors = [anchor for anchor in anchors if anchor is not None]
    if not anchors:
        return {"evaluated_count": 0, "pending_count": len(audits)}

    query_start_ms = min(anchors) - 6 * 3600 * 1000
    sleeps_response = (
        supabase.table("sleeps")
        .select("id,start_time,end_time,created_at,duration_seconds")
        .eq("baby_id", baby_id)
        .gte("created_at", _from_ms(query_start_ms))
        .order("created_at")
        .execute()
    )
    sleeps = sleeps_response.data or []

    normalized_sleeps = []
    for sleep in sleeps:
        start_ms = _to_ms(sleep.get("start_time")) or _to_ms(sleep.get("created_at"))
        if start_ms is None:
            continue
        normalized_sleeps.append({**sleep, "start_time_ms": start_ms})
    normalized_sleeps.sort(key=lambda sleep: sleep["start_time_ms"])

    evaluated_count = 0
    for audit in audits:
        anchor_ms = audit.get("request_time_ms") or _to_ms(audit.get("created_at"))
        predicted_time_ms = audit.get("predicted_next_sleep_time_ms")
        predicted_duration = audit.get("predicted_duration_seconds")
        if anchor_ms is None or predicted_time_ms is None:
            continue

        actual_sleep = next(
            (sleep for sleep in normalized_sleeps if sleep["start_time_ms"] >= anchor_ms),
            None,
        )
        if not actual_sleep:
            continue

        actual_start_ms = actual_sleep["start_time_ms"]
        actual_duration = actual_sleep.get("duration_seconds")
        update_payload = {
            "actual_sleep_id": actual_sleep.get("id"),
            "actual_next_sleep_time_ms": actual_start_ms,
            "actual_duration_seconds": actual_duration,
            "time_error_minutes": round((actual_start_ms - int(predicted_time_ms)) / 60000, 2),
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

        if actual_duration is not None and predicted_duration is not None:
            update_payload["duration_error_seconds"] = int(actual_duration) - int(predicted_duration)

        supabase.table("sleep_predictions_audit").update(update_payload).eq("id", audit["id"]).execute()
        evaluated_count += 1

    return {
        "evaluated_count": evaluated_count,
        "pending_count": len(audits) - evaluated_count,
    }
