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
- A [Google Stitch API key](https://stitch.withgoogle.com/docs)
- A [Supabase](https://supabase.com) project (URL + anon key)

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

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

## First-time Setup (Onboarding)

1. Enter your **Stitch API key** and click "Validate & Continue"
2. Enter your **Supabase project URL** and **anon key**, click "Connect & Continue"
3. The app will auto-provision required database tables and redirect you to the workspace

## Usage

- **Design**: Type a screen description in the chat and click "Design"
- **Edit**: Select a screen on the canvas, switch to "Edit" mode, describe changes
- **Variants**: Select a screen, type variant instructions, click "Variants"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboard/validate-stitch` | Validate Stitch API key |
| POST | `/api/onboard/validate-supabase` | Validate Supabase credentials |
| POST | `/api/onboard/initialize-workspace` | Create default project |
| GET  | `/api/onboard/session-status` | Check authentication |
| POST | `/api/generate` | Generate a new screen |
| POST | `/api/edit` | Edit an existing screen |
| POST | `/api/variants` | Generate screen variants |
| GET  | `/api/screens/{project_id}` | List all screens |
| GET  | `/api/projects` | List all projects |
| GET  | `/api/chat-history/{project_id}` | Get chat history |
| DELETE | `/api/screens/{screen_id}` | Delete a screen |
