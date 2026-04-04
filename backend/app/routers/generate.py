from fastapi import APIRouter, Request, HTTPException
from app.models.requests import GenerateRequest, EditRequest, VariantsRequest
from app.services import stitch_bridge, supabase_client
from app.services.session_manager import require_session
import logging
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger(__name__)


def _stitch_creds(creds: dict) -> dict:
    """Return the Stitch auth fields for the bridge payload."""
    return {
        "access_token": creds["stitch_access_token"],
        "project_id": creds["stitch_project_id"],
    }


def _build_screen_payload(creds, screen_data, prompt, project_id, parent_screen_id=None):
    """Store screen in Supabase and return response payload."""
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    insert_data = {
        "project_id": project_id,
        "stitch_screen_id": screen_data["screen_id"],
        "prompt": prompt,
        "html_url": screen_data.get("html_url", ""),
        "image_url": screen_data.get("image_url", ""),
        "device_type": screen_data.get("device_type", "DESKTOP"),
    }
    if parent_screen_id:
        insert_data["parent_screen_id"] = parent_screen_id

    resp = client.table("screens").insert(insert_data).execute()
    screen = resp.data[0] if resp.data else insert_data
    screen["id"] = screen.get("id", screen_data["screen_id"])

    client.table("chat_history").insert({
        "project_id": project_id,
        "role": "system",
        "content": "Screen generated successfully.",
        "screen_id": screen.get("id"),
    }).execute()

    return {
        "screen": {
            "id": screen.get("id", ""),
            "stitch_screen_id": screen_data["screen_id"],
            "prompt": prompt,
            "html_url": screen_data.get("html_url", ""),
            "image_url": screen_data.get("image_url", ""),
            "device_type": screen_data.get("device_type", "DESKTOP"),
            "parent_screen_id": parent_screen_id,
            "created_at": screen.get("created_at", datetime.now(timezone.utc).isoformat()),
        },
        "chat_message": {
            "role": "system",
            "content": "Screen generated successfully.",
            "screen_id": screen.get("id", ""),
        }
    }


@router.post("/generate")
async def generate_screen(request: Request, body: GenerateRequest):
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    client.table("chat_history").insert({
        "project_id": body.project_id,
        "role": "user",
        "content": body.prompt,
    }).execute()

    proj_resp = client.table("projects").select("stitch_project_id").eq("id", body.project_id).single().execute()
    stitch_project_id = proj_resp.data.get("stitch_project_id") if proj_resp.data else None

    payload = {
        "action": "generate",
        **_stitch_creds(creds),
        "stitch_project_id": stitch_project_id,
        "prompt": body.prompt,
        "device_type": body.device_type,
    }

    result = await stitch_bridge.call_bridge(payload)

    if not result.get("success"):
        error = result.get("error", {})
        raise HTTPException(status_code=500, detail=stitch_bridge.map_error_message(error.get("code", "UNKNOWN_ERROR")))

    screens = result.get("screens", [])
    if not screens:
        raise HTTPException(status_code=500, detail="No screens returned from Stitch.")

    return _build_screen_payload(creds, screens[0], body.prompt, body.project_id)


@router.post("/edit")
async def edit_screen(request: Request, body: EditRequest):
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    client.table("chat_history").insert({
        "project_id": body.project_id,
        "role": "user",
        "content": body.prompt,
    }).execute()

    screen_resp = client.table("screens").select("stitch_screen_id").eq("id", body.screen_id).single().execute()
    stitch_screen_id = screen_resp.data.get("stitch_screen_id") if screen_resp.data else body.screen_id

    proj_resp = client.table("projects").select("stitch_project_id").eq("id", body.project_id).single().execute()
    stitch_project_id = proj_resp.data.get("stitch_project_id") if proj_resp.data else None

    payload = {
        "action": "edit",
        **_stitch_creds(creds),
        "stitch_project_id": stitch_project_id,
        "screen_id": stitch_screen_id,
        "prompt": body.prompt,
    }

    result = await stitch_bridge.call_bridge(payload)

    if not result.get("success"):
        error = result.get("error", {})
        raise HTTPException(status_code=500, detail=stitch_bridge.map_error_message(error.get("code", "UNKNOWN_ERROR")))

    screens = result.get("screens", [])
    if not screens:
        raise HTTPException(status_code=500, detail="No screens returned from Stitch.")

    return _build_screen_payload(creds, screens[0], body.prompt, body.project_id, parent_screen_id=body.screen_id)


@router.post("/variants")
async def generate_variants(request: Request, body: VariantsRequest):
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    screen_resp = client.table("screens").select("stitch_screen_id").eq("id", body.screen_id).single().execute()
    stitch_screen_id = screen_resp.data.get("stitch_screen_id") if screen_resp.data else body.screen_id

    proj_resp = client.table("projects").select("stitch_project_id").eq("id", body.project_id).single().execute()
    stitch_project_id = proj_resp.data.get("stitch_project_id") if proj_resp.data else None

    payload = {
        "action": "variants",
        **_stitch_creds(creds),
        "stitch_project_id": stitch_project_id,
        "screen_id": stitch_screen_id,
        "prompt": body.prompt,
        "variant_options": {"variantCount": body.variant_count},
    }

    result = await stitch_bridge.call_bridge(payload)

    if not result.get("success"):
        error = result.get("error", {})
        raise HTTPException(status_code=500, detail=stitch_bridge.map_error_message(error.get("code", "UNKNOWN_ERROR")))

    all_screens = []
    for screen_data in result.get("screens", []):
        item = _build_screen_payload(creds, screen_data, body.prompt, body.project_id, parent_screen_id=body.screen_id)
        all_screens.append(item["screen"])

    return {"screens": all_screens}
