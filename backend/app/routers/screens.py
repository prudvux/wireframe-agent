from fastapi import APIRouter, Request
from app.services import supabase_client
from app.services.session_manager import require_session

router = APIRouter()

@router.get("/screens/{project_id}")
async def get_screens(project_id: str, request: Request):
    """Return all screens for a project."""
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    resp = client.table("screens").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
    return {"screens": resp.data or []}

@router.get("/projects")
async def get_projects(request: Request):
    """Return all projects for the current session."""
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    resp = client.table("projects").select("*").order("created_at", desc=True).execute()
    return {"projects": resp.data or []}

@router.get("/chat-history/{project_id}")
async def get_chat_history(project_id: str, request: Request):
    """Return chat history for a project."""
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    resp = client.table("chat_history").select("*").eq("project_id", project_id).order("created_at").execute()
    return {"messages": resp.data or []}

@router.delete("/screens/{screen_id}")
async def delete_screen(screen_id: str, request: Request):
    """Remove a screen from Supabase."""
    creds = require_session(request)
    client = supabase_client.get_supabase_client(creds["supabase_url"], creds["supabase_anon_key"])

    client.table("screens").delete().eq("id", screen_id).execute()
    return {"deleted": True}
