import json
import os
import logging
import subprocess
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=4)


def _call_bridge_sync(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke the Node.js Stitch bridge synchronously via subprocess."""
    bridge_path = os.path.join(os.path.dirname(__file__), "..", "..", "bridge", "stitch-bridge.js")
    bridge_path = os.path.abspath(bridge_path)
    bridge_dir = os.path.dirname(bridge_path)
    input_json = json.dumps(payload)

    try:
        result = subprocess.run(
            ["node", bridge_path],
            input=input_json,
            capture_output=True,
            text=True,
            cwd=bridge_dir,
            timeout=settings.BRIDGE_TIMEOUT,
        )

        stderr_text = result.stderr.strip() if result.stderr else ""
        stdout_text = result.stdout.strip() if result.stdout else ""

        if stderr_text:
            logger.warning(f"Bridge stderr: {stderr_text}")

        if not stdout_text:
            logger.error(f"Bridge produced no output. stderr: {stderr_text}")
            return {
                "success": False,
                "screens": [],
                "error": {"code": "NETWORK_ERROR", "message": f"Bridge produced no output. {stderr_text}", "recoverable": True}
            }

        return json.loads(stdout_text)

    except subprocess.TimeoutExpired:
        logger.error("Bridge timed out")
        return {
            "success": False,
            "screens": [],
            "error": {"code": "TIMEOUT", "message": "Stitch request timed out.", "recoverable": True}
        }
    except json.JSONDecodeError as e:
        logger.error(f"Bridge returned invalid JSON: {e}")
        return {
            "success": False,
            "screens": [],
            "error": {"code": "UNKNOWN_ERROR", "message": "Something went wrong. Please try again.", "recoverable": True}
        }
    except Exception as e:
        logger.error(f"Bridge error: {type(e).__name__}: {e}")
        return {
            "success": False,
            "screens": [],
            "error": {"code": "NETWORK_ERROR", "message": str(e), "recoverable": True}
        }


async def call_bridge(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Run the bridge call in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _call_bridge_sync, payload)


def map_error_message(code: str) -> str:
    messages = {
        "AUTH_FAILED": "Your Stitch credentials are invalid or expired. Please update them in settings.",
        "RATE_LIMITED": "Stitch is rate-limiting requests. Please wait a moment and try again.",
        "NOT_FOUND": "The screen or project was not found in Stitch. It may have been deleted externally.",
        "NETWORK_ERROR": "Unable to reach Stitch servers. Check your internet connection.",
        "VALIDATION_ERROR": "Stitch couldn't process that prompt. Try rephrasing your description.",
        "TIMEOUT": "Stitch request timed out. Please try again.",
    }
    return messages.get(code, "Something went wrong. Please try again.")
