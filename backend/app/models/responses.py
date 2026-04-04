from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ScreenResponse(BaseModel):
    id: str
    stitch_screen_id: str
    prompt: str
    html_url: str
    image_url: str
    device_type: str
    parent_screen_id: Optional[str] = None
    created_at: str

class ChatMessageResponse(BaseModel):
    role: str
    content: str
    screen_id: Optional[str] = None

class GenerateResponse(BaseModel):
    screen: ScreenResponse
    chat_message: ChatMessageResponse

class ScreensListResponse(BaseModel):
    screens: List[ScreenResponse]

class ProjectResponse(BaseModel):
    id: str
    stitch_project_id: str
    title: str
    created_at: str

class ProjectsListResponse(BaseModel):
    projects: List[ProjectResponse]
