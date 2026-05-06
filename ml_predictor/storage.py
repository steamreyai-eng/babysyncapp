import json
import mimetypes
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MODEL_STORAGE_ENABLED = os.environ.get("MODEL_STORAGE_ENABLED", "true").lower() in {"1", "true", "yes"}
MODEL_STORAGE_BUCKET = os.environ.get("MODEL_STORAGE_BUCKET", "ml-models")
MODEL_STORAGE_PREFIX = os.environ.get("MODEL_STORAGE_PREFIX", "global").strip("/")


def storage_enabled() -> bool:
    return bool(MODEL_STORAGE_ENABLED and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def object_path(name: str) -> str:
    return f"{MODEL_STORAGE_PREFIX}/{name}" if MODEL_STORAGE_PREFIX else name


def _object_url(path: str) -> str:
    encoded_bucket = quote(MODEL_STORAGE_BUCKET, safe="")
    encoded_path = quote(path, safe="/")
    return f"{SUPABASE_URL}/storage/v1/object/{encoded_bucket}/{encoded_path}"


def _headers(content_type: str | None = None) -> dict:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_file(local_path: str, remote_path: str | None = None) -> bool:
    if not storage_enabled():
        return False

    path = Path(local_path)
    if not path.exists():
        return False

    remote = remote_path or object_path(path.name)
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix == ".json":
        content_type = "application/json"

    try:
        request = Request(
            _object_url(remote),
            data=path.read_bytes(),
            headers={**_headers(content_type), "x-upsert": "true"},
            method="POST",
        )
        with urlopen(request, timeout=60):
            return True
    except (HTTPError, URLError, TimeoutError) as e:
        print(f"Model artifact upload skipped for {path.name}: {e}")
        return False


def download_file(remote_name: str, local_path: str) -> bool:
    if not storage_enabled():
        return False

    remote = object_path(remote_name)
    try:
        request = Request(_object_url(remote), headers=_headers(), method="GET")
        with urlopen(request, timeout=60) as response:
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)
            Path(local_path).write_bytes(response.read())
        return True
    except HTTPError as e:
        if e.code != 404:
            print(f"Model artifact download failed for {remote_name}: {e}")
        return False
    except (URLError, TimeoutError) as e:
        print(f"Model artifact download failed for {remote_name}: {e}")
        return False


def download_json(remote_name: str) -> dict | None:
    if not storage_enabled():
        return None

    remote = object_path(remote_name)
    try:
        request = Request(_object_url(remote), headers=_headers(), method="GET")
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        if e.code != 404:
            print(f"Model metadata download failed for {remote_name}: {e}")
        return None
    except (json.JSONDecodeError, URLError, TimeoutError) as e:
        print(f"Model metadata download failed for {remote_name}: {e}")
        return None


def upload_global_artifacts(models_dir: str, include_last_training: bool = True) -> list[str]:
    uploaded = []
    artifact_names = [
        "global_model_wake.pkl",
        "global_model_duration.pkl",
        "global_model_metadata.json",
        "global_model_metrics.json",
    ]
    if include_last_training:
        artifact_names.append("global_model_last_training_metrics.json")

    for name in artifact_names:
        local_path = os.path.join(models_dir, name)
        if upload_file(local_path, object_path(name)):
            uploaded.append(name)

    return uploaded
