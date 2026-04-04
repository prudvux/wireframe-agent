from pydantic import BaseModel
from typing import Optional

class StitchValidateRequest(BaseModel):
    access_token: str
    google_cloud_project_id: str

class SupabaseValidateRequest(BaseModel):
    supabase_url: str
    supabase_anon_key: str

class GenerateRequest(BaseModel):
    prompt: str
    project_id: str
    device_type: str = "DESKTOP"

class EditRequest(BaseModel):
    prompt: str
    screen_id: str
    project_id: str

class VariantsRequest(BaseModel):
    prompt: str
    screen_id: str
    project_id: str
    variant_count: int = 3
