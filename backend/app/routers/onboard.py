from fastapi import APIRouter, Request, HTTPException
from app.models.requests import StitchValidateRequest, SupabaseValidateRequest
from app.services import stitch_bridge, supabase_client
from app.services.session_manager import set_session_credentials, get_session_credentials
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/validate-stitch")
async def validate_stitch(request: Request, body: StitchValidateRequest):
    """Validate Stitch OAuth credentials and return project list."""
    payload = {
        "action": "validate",
        "access_token": body.access_token,
        "project_id": body.google_cloud_project_id,
    }

    result = await stitch_bridge.call_bridge(payload)

    if not result.get("success"):
        error = result.get("error", {})
        return {
            "valid": False,
            "error": f"{error.get('code', 'UNKNOWN_ERROR')}: {error.get('message', 'Validation failed')}."
        }

    # Save credentials to session
    existing = get_session_credentials(request) or {}
    existing["stitch_access_token"] = body.access_token
    existing["stitch_project_id"] = body.google_cloud_project_id
    set_session_credentials(request, existing)

    return {
        "valid": True,
        "projects": result.get("projects", [])
    }

@router.post("/validate-supabase")
async def validate_supabase(request: Request, body: SupabaseValidateRequest):
    """Validate Supabase credentials and provision tables."""
    connected = await supabase_client.test_connection(body.supabase_url, body.supabase_anon_key)
    if not connected:
        return {"valid": False, "error": "Unable to connect to Supabase. Check your URL and anon key."}

    try:
        await supabase_client.provision_tables(body.supabase_url, body.supabase_anon_key)
    except Exception as e:
        logger.warning(f"Table provisioning warning: {e}")

    existing = get_session_credentials(request) or {}
    existing["supabase_url"] = body.supabase_url
    existing["supabase_anon_key"] = body.supabase_anon_key
    set_session_credentials(request, existing)

    return {"valid": True, "tables_provisioned": True}

@router.post("/initialize-workspace")
async def initialize_workspace(request: Request):
    """Create a default Stitch project and store in Supabase."""
    from app.services.session_manager import require_session
    creds = require_session(request)

    payload = {
        "action": "create_project",
        "access_token": creds["stitch_access_token"],
        "project_id": creds["stitch_project_id"],
        "title": "My Designs",
    }
    result = await stitch_bridge.call_bridge(payload)
    logger.info(f"Bridge create_project result: {result}")

    if not result.get("success"):
        error = result.get("error", {})
        msg = error.get("message", "Unknown bridge error")
        logger.error(f"Bridge create_project failed: {msg}")
        raise HTTPException(status_code=500, detail=f"Failed to create Stitch project: {msg}")

    project_data = result.get("project", {})
    stitch_project_id = project_data.get("id")

    try:
        client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])
        resp = client.table("projects").insert({
            "stitch_project_id": stitch_project_id,
            "title": "My Designs",
        }).execute()
    except Exception as e:
        logger.error(f"Supabase insert failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=(
                f"Database error: {e}. "
                "Make sure you have run the SQL migration in your Supabase SQL Editor. "
                "Go to Supabase Dashboard → SQL Editor and run the migration SQL shown in the onboarding screen."
            )
        )

    project = resp.data[0] if resp.data else {}
    creds["default_project_id"] = project.get("id")
    set_session_credentials(request, creds)

    return {"project": project}

@router.get("/session-status")
async def session_status(request: Request):
    """Check if user has a valid session."""
    creds = get_session_credentials(request)
    has_stitch = bool(creds and creds.get("stitch_access_token"))
    has_supabase = bool(creds and creds.get("supabase_url"))
    has_project = bool(creds and creds.get("default_project_id"))

    if has_stitch and has_supabase and has_project:
        return {"authenticated": True, "default_project_id": creds.get("default_project_id"), "resume_step": 4}
    if has_stitch and has_supabase:
        return {"authenticated": True, "default_project_id": None, "resume_step": 3}
    return {"authenticated": False, "resume_step": 1}
