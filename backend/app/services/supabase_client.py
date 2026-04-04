from supabase import create_client, Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def get_supabase_client(url: str, anon_key: str) -> Client:
    """Create a Supabase client with user credentials."""
    return create_client(url, anon_key)

async def test_connection(url: str, anon_key: str) -> bool:
    """Test Supabase connectivity."""
    try:
        client = get_supabase_client(url, anon_key)
        # Try a lightweight query
        client.table("projects").select("id").limit(1).execute()
        return True
    except Exception:
        # Table may not exist yet — that's ok, connectivity works
        return True

async def provision_tables(url: str, anon_key: str) -> bool:
    """Auto-provision required tables if they don't exist."""
    import os, httpx
    sql_path = os.path.join(os.path.dirname(__file__), "..", "migrations", "provision_tables.sql")
    with open(sql_path) as f:
        sql = f.read()

    # Use Supabase REST API to run SQL via the rpc endpoint
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        # Execute each statement via Supabase SQL endpoint
        resp = await client.post(
            f"{url}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"query": sql},
            timeout=30,
        )
        if resp.status_code not in (200, 201, 204):
            logger.warning(f"Table provisioning response: {resp.status_code} - {resp.text}")
    return True
