from starlette.requests import Request
from typing import Optional, Dict, Any

SESSION_KEY = "stitch_session"

def get_session_credentials(request: Request) -> Optional[Dict[str, Any]]:
    """Read credentials from the encrypted session."""
    return request.session.get(SESSION_KEY)

def set_session_credentials(request: Request, credentials: Dict[str, Any]) -> None:
    """Store credentials in the encrypted session."""
    request.session[SESSION_KEY] = credentials

def clear_session(request: Request) -> None:
    """Clear the session."""
    request.session.pop(SESSION_KEY, None)

def require_session(request: Request) -> Dict[str, Any]:
    """Get credentials or raise 401."""
    from fastapi import HTTPException
    creds = get_session_credentials(request)
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated. Please complete onboarding.")
    return creds
