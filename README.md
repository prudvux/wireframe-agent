# Stitch Design Studio

A web application that combines an AI-powered chat interface with a design canvas to generate UI screens using Google's Stitch SDK.

## Architecture

```
wireframe-agent/
├── backend/        # Python FastAPI backend + Node.js Stitch bridge
└── frontend/       # Angular 15 frontend
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` CLI) — required to obtain OAuth2 access tokens
- A Google Cloud project with the [Stitch API enabled](https://console.cloud.google.com/apis/library/stitch.googleapis.com)
- A [Supabase](https://supabase.com) project (URL + anon/JWT key)

## Setup

### 1. Backend

```bash
cd backend

# Install Node bridge dependencies
cd bridge && npm install && cd ..

# Create Python virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server (use any free port)
uvicorn app.main:app --reload --port 8003
```

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

> **Note (Windows):** If `gcloud` is not on your PATH, use the full path:
> `C:\Users\<you>\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`
> Or open **Google Cloud SDK Shell** from the Start menu.

## Supabase Database Setup

Before completing onboarding, run this SQL in your **Supabase SQL Editor** (Project → SQL Editor → New query):

```sql
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stitch_project_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Designs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stitch_screen_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  html_url TEXT,
  image_url TEXT,
  parent_screen_id UUID REFERENCES screens(id),
  device_type TEXT DEFAULT 'DESKTOP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'system')),
  content TEXT NOT NULL,
  screen_id UUID REFERENCES screens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> The Supabase anon key must be the **JWT key** (starts with `eyJ...`), found under Project Settings → API → Project API keys → `anon public`. The `sb_publishable_` key format is not supported.

## First-time Onboarding

### Step 1 — Connect Google Stitch

Get a fresh OAuth2 access token:

```bash
gcloud auth print-access-token
```

Enter the token (`ya29...`) and your **Google Cloud Project ID** in the onboarding form.

> Tokens expire after **1 hour**. Re-run the command to get a fresh one if you see an auth error.

### Step 2 — Connect Supabase

Enter your Supabase **Project URL** and **anon JWT key**.

### Step 3 — Workspace Initialization

The app automatically creates a Stitch project and sets up your workspace. You'll be redirected to the workspace on success.

> If Step 3 fails with a database error, make sure you ran the SQL migration above first.

## Usage

- **Generate**: Type a screen description in the chat and click "Design"
- **Edit**: Select a screen on the canvas, type edit instructions, click "Edit"
- **Variants**: Select a screen, describe variations, click "Variants"
- **Preview**: Click any screen card to expand it into a full HTML preview

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboard/validate-stitch` | Validate Stitch OAuth token |
| POST | `/api/onboard/validate-supabase` | Validate Supabase credentials |
| POST | `/api/onboard/initialize-workspace` | Create default Stitch project |
| GET  | `/api/onboard/session-status` | Check authentication + resume step |
| POST | `/api/generate` | Generate a new screen |
| POST | `/api/edit` | Edit an existing screen |
| POST | `/api/variants` | Generate screen variants |
| GET  | `/api/screens/{project_id}` | List all screens |
| GET  | `/api/projects` | List all projects |
| GET  | `/api/chat-history/{project_id}` | Get chat history |
| DELETE | `/api/screens/{screen_id}` | Delete a screen |

## Known Limitations

- OAuth tokens expire after ~1 hour — you'll need to re-run `gcloud auth print-access-token` and re-onboard if your session expires
- The Stitch SDK is TypeScript-only; the Python backend invokes it via a Node.js subprocess bridge
- On Windows, `asyncio.create_subprocess_exec` is not supported — the bridge uses `subprocess.run()` in a `ThreadPoolExecutor` instead
- Generated HTML/image URLs from Stitch may expire; the app does not cache them locally
- The app is desktop-focused (minimum viewport: 1024px)
