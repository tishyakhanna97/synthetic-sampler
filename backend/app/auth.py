import os

from fastapi import HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
AUTH_DISABLED = os.getenv("AUTH_DISABLED", "").lower() == "true"


def verify_google_token(token: str) -> dict:
    """Verify a Google ID token and return the decoded payload."""
    try:
        payload = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def require_auth(request: Request) -> dict:
    """FastAPI dependency that enforces Google OAuth auth.

    Returns the verified token payload, or a stub if AUTH_DISABLED.
    """
    if AUTH_DISABLED:
        return {"email": "dev@local"}

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[len("Bearer "):]
    payload = verify_google_token(token)

    return payload
