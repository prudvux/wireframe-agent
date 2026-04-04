from pydantic_settings import BaseSettings
import secrets

class Settings(BaseSettings):
    SECRET_KEY: str = secrets.token_hex(32)
    NODE_BRIDGE_PATH: str = "bridge/stitch-bridge.js"
    BRIDGE_TIMEOUT: int = 300  # 5 minutes

    class Config:
        env_file = ".env"

settings = Settings()
