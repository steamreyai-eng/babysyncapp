import os
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_AUTH_API_KEY = (
    os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or SUPABASE_SERVICE_ROLE_KEY
)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

security = HTTPBearer()

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("Supabase credentials not configured in environment.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    Verifies a Supabase access token and returns the user_id.
    Raises 401 if invalid.
    """
    token = credentials.credentials

    if SUPABASE_URL and SUPABASE_AUTH_API_KEY:
        try:
            request = Request(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": SUPABASE_AUTH_API_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
            with urlopen(request, timeout=10) as response:
                user = json.loads(response.read().decode("utf-8"))
            user_id = user.get("id")
            if user_id:
                return user_id
            raise HTTPException(status_code=401, detail="Invalid token payload: no user id")
        except HTTPError as e:
            if e.code in (401, 403):
                raise HTTPException(status_code=401, detail="Invalid authentication token")
            print(f"Supabase token verification HTTP error: {e}")
        except (URLError, TimeoutError, json.JSONDecodeError) as e:
            print(f"Supabase token verification failed, falling back to legacy JWT secret: {e}")

    if not SUPABASE_JWT_SECRET:
        print("WARNING: SUPABASE_JWT_SECRET is not set")
        raise HTTPException(status_code=500, detail="JWT secret not configured")

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload: no sub claim")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")

async def verify_baby_ownership(baby_id: str, user_id: str = Security(verify_jwt)) -> str:
    """
    Verifies that the requested baby_id belongs to the authenticated user.
    Uses Supabase service role client to query baby_profile.
    Raises 403 if no access.
    """
    if not baby_id:
        raise HTTPException(status_code=400, detail="baby_id is required")
        
    supabase = get_supabase_client()
    try:
        # Standard check: does this user have a baby_profile linking them to baby_id?
        response = supabase.table("baby_profile").select("baby_id").eq("user_id", user_id).eq("baby_id", baby_id).execute()
        if not response.data or len(response.data) == 0:
            # Fallback for older schema: maybe baby_profile.id == baby_id
            response2 = supabase.table("baby_profile").select("id").eq("user_id", user_id).eq("id", baby_id).execute()
            if not response2.data or len(response2.data) == 0:
                raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this baby_id")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Auth ownership error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error verifying ownership")
        
    return baby_id
