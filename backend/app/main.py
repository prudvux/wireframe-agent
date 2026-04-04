import asyncio
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.routers import onboard, generate, screens
from app.config import settings

app = FastAPI(title="Stitch Design Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=86400,  # 24 hours
)

app.include_router(onboard.router, prefix="/api/onboard", tags=["onboard"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(screens.router, prefix="/api", tags=["screens"])

@app.get("/health")
async def health():
    return {"status": "ok"}
