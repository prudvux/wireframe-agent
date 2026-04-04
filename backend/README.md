# Stitch Design Studio — Backend

FastAPI backend that bridges the Angular frontend to the Google Stitch SDK via a Node.js subprocess.

## Prerequisites

- Python 3.11+
- Node.js 18+ (with npm)
- A Google Stitch API key (https://stitch.withgoogle.com)
- A Supabase project (https://supabase.com)

## Setup

### 1. Install Python dependencies

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Install Node.js bridge dependencies

```bash
cd bridge
npm install
cd ..
```

### 3. Configure environment (optional)

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your-secret-key-here
BRIDGE_TIMEOUT=300
```

If `SECRET_KEY` is not set, a random one is generated each run (sessions won't persist across restarts).

### 4. Run the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000.

Interactive API docs: http://localhost:8000/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/onboard/validate-stitch` | Validate Stitch API key |
| POST | `/api/onboard/validate-supabase` | Validate Supabase credentials |
| POST | `/api/onboard/initialize-workspace` | Create default project |
| GET | `/api/onboard/session-status` | Check session state |
| POST | `/api/generate` | Generate a new screen |
| POST | `/api/edit` | Edit an existing screen |
| POST | `/api/variants` | Generate screen variants |
| GET | `/api/projects` | List all projects |
| GET | `/api/screens/{project_id}` | List screens for a project |
| GET | `/api/chat-history/{project_id}` | Get chat history |
| DELETE | `/api/screens/{screen_id}` | Delete a screen |

## Architecture

```
FastAPI app
  └── routers/
        ├── onboard.py    — credential validation & session setup
        ├── generate.py   — screen generation, editing, variants
        └── screens.py    — CRUD for screens/projects/chat history
  └── services/
        ├── stitch_bridge.py   — calls Node.js subprocess
        ├── supabase_client.py — Supabase CRUD helpers
        └── session_manager.py — encrypted session helpers

bridge/
  └── stitch-bridge.js   — reads JSON from stdin, calls Stitch SDK, writes JSON to stdout
```

## Database Tables

The backend auto-provisions these tables in your Supabase project on first connect:

- `projects` — Stitch project references
- `screens` — Generated screen metadata (HTML/image URLs, prompts)
- `chat_history` — User and system messages per project
