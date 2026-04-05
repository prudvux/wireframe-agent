# Product Requirements Document: Stitch Design Integration

**Version:** 1.1 (As-Built)
**Date:** April 5, 2026
**Status:** Implemented (MVP)

> This document reflects the actual implemented state of the application as of v1.1. Sections that differ from the original v1.0 draft are marked **[UPDATED]**.

---

## 1. Executive Summary

This stitch integrationed web application combines an AI-powered chat interface with a read-only design canvas to enable users to generate, iterate on, and manage UI screen designs using Google's Stitch SDK. Users describe screens in natural language through a chat panel, and the generated designs appear automatically on an adjacent canvas viewer — creating a seamless prompt-to-screen workflow without requiring any design tool expertise.

---

## 2. Problem Statement

Designers and non-designers alike face a gap between imagining a UI and producing one. Traditional design tools (Figma, Sketch) require significant skill. Existing AI design tools often operate as black boxes with no iterative refinement. There is no product today that combines conversational AI interaction with programmatic UI generation from Google Stitch in a unified workspace where users can generate, refine, and review screens in one place.

---

## 3. Goals and Objectives

| Goal | Success Metric |
|------|---------------|
| Enable non-designers to produce UI screens from text prompts | User can go from prompt to rendered screen in under 60 seconds |
| Support iterative refinement through conversational editing | Users can edit a generated screen via follow-up prompts without starting over |
| Provide a persistent workspace with full design history | All generated screens and chat history are retrievable across sessions |
| Deliver a self-service onboarding experience | Users configure their own Stitch and Supabase credentials with zero developer intervention |

---

## 4. Target Users

**Primary:** Product managers, startup founders, and UX researchers who need to rapidly prototype UI concepts without design tool proficiency.

**Secondary:** Frontend developers who want to generate starter UI scaffolds from descriptions before coding. Freelance designers who want AI-assisted ideation for client projects.

---

## 5. User Flow

### 5.1 Onboarding **[UPDATED]**

The application has no pre-configured backend database or API keys. Each user brings their own credentials.

**Step 1 — Stitch Authentication**

- User is presented with two input fields: **OAuth2 Access Token** and **Google Cloud Project ID**.
- The access token is obtained by running `gcloud auth print-access-token` in a terminal. Tokens expire after ~1 hour.
- On clicking "Validate & Continue," the backend calls the Stitch SDK (`stitch.projects()`) via the Node.js bridge to verify the credentials.
- If validation fails, an inline error is displayed with the specific error code and message.
- If validation succeeds, credentials are saved to the server-side session and Step 2 becomes active.

> **Implementation note:** The original PRD specified a Stitch API key (`AQ.` format). The Stitch MCP endpoint (`stitch.googleapis.com/mcp`) does not support API keys — only Google OAuth2 access tokens. Authentication was changed to `access_token + google_cloud_project_id`.

**Step 2 — Supabase Configuration**

- The UI displays the full SQL migration script that the user must run manually in their Supabase SQL Editor before proceeding.
- User enters their Supabase **Project URL** and **anon JWT key** (`eyJ...` format).
- On clicking "Connect & Continue," the backend tests connectivity.
- Credentials are saved to the server-side session.

> **Implementation note:** The original PRD specified auto-provisioning tables via `/rest/v1/rpc/exec_sql`. This endpoint does not exist in Supabase. Tables must be created manually by the user via the SQL Editor. The SQL is shown in the onboarding UI.

**Step 3 — Workspace Initialization**

- The backend creates a default Stitch project via the Node bridge (`stitch.createProject("My Designs")`).
- The project ID is stored in the user's Supabase `projects` table.
- Credentials and `default_project_id` are saved to the encrypted server-side session.
- The user is redirected to the design workspace.

**Session Resume**

- If the user navigates away mid-onboarding, the `GET /api/onboard/session-status` endpoint returns a `resume_step` field indicating how far they got.
- If Steps 1 & 2 are complete but Step 3 failed, the onboarding component automatically jumps to Step 3 and retries initialization on load.
- If fully authenticated (all 3 steps done), the user is immediately redirected to the workspace.

### 5.2 Design Workspace

The workspace is a split-pane layout occupying the full viewport.

**Left Panel — Chat Interface (40% width)**

- A scrollable message list showing conversation history.
- A text input with two action buttons:
  - **"Design"** — Sends the prompt as a new screen generation request.
  - **"Edit"** — Sends the prompt as an edit instruction for the currently selected screen. Disabled when no screen is selected.
- Loading indicator displayed while Stitch processes the request.
- System messages include a thumbnail of the generated screen.

**Right Panel — Canvas Viewer (60% width)**

- A read-only gallery of all generated screens.
- Each screen is a clickable thumbnail card showing: image, prompt (truncated), and timestamp.
- Clicking a thumbnail selects it (highlighted border) and enables the "Edit" button.
- A selected screen can be expanded into a full-preview modal rendering the HTML in a sandboxed iframe.
- Screens displayed in reverse chronological order (newest first).

**Error State**

- If the workspace loads without an active session/project, a full-screen error state is shown with a "Complete Onboarding →" button linking back to `/onboarding`.

### 5.3 Screen Generation Lifecycle

1. User types a screen description in the chat input and clicks "Design."
2. The Angular frontend sends `POST /api/generate` with the prompt and project ID.
3. FastAPI reads credentials from the session, logs the user message to Supabase `chat_history`.
4. FastAPI looks up the `stitch_project_id` from Supabase `projects`.
5. FastAPI invokes the Node.js bridge with `action: "generate"`, `access_token`, `project_id`, `stitch_project_id`, `prompt`, and `device_type`.
6. The bridge calls `project.generate(prompt, deviceType)` — note: `deviceType` is a positional string argument, not an options object.
7. Stitch processes the prompt and returns a Screen object.
8. The bridge calls `screen.getHtml()` and `screen.getImage()` and returns both URLs to FastAPI.
9. FastAPI stores the screen in Supabase `screens` and logs a system message to `chat_history`.
10. FastAPI returns the screen payload and chat message to the Angular frontend.
11. The frontend adds the screen thumbnail to the canvas and appends a success message to the chat.

### 5.4 Screen Editing Lifecycle

1. User selects an existing screen on the canvas.
2. User types an edit instruction and clicks "Edit."
3. The frontend sends `POST /api/edit` with the prompt, screen ID, and project ID.
4. FastAPI looks up the `stitch_screen_id` from Supabase `screens`.
5. The Node bridge calls `screen.edit(prompt, deviceType)`.
6. The edited screen is stored in Supabase with `parent_screen_id` referencing the original.
7. The new screen appears on the canvas; the original is preserved.

### 5.5 Variant Generation

1. User selects an existing screen on the canvas.
2. User types a variant instruction and clicks "Variants."
3. The backend calls `screen.variants(prompt, { variantCount: 3 }, deviceType)`.
4. Multiple screens are returned, stored, and displayed on the canvas.

---

## 6. Functional Requirements

### 6.1 Onboarding Module **[UPDATED]**

| ID | Requirement | Status |
|----|------------|--------|
| F-ONB-01 | Multi-step onboarding form collecting Stitch OAuth token + GCP project ID and Supabase credentials | Implemented |
| F-ONB-02 | Validate Stitch credentials by calling `stitch.projects()` via the Node bridge | Implemented |
| F-ONB-03 | Validate Supabase credentials by performing a test query | Implemented |
| F-ONB-04 | Display SQL migration script in the UI for manual execution | Implemented |
| F-ONB-05 | Display clear error messages with the actual error detail from FastAPI | Implemented |
| F-ONB-06 | Store validated credentials in an encrypted server-side session (24-hour TTL) | Implemented |
| F-ONB-07 | `session-status` endpoint returns `resume_step` to allow mid-onboarding recovery | Implemented |
| F-ONB-08 | Auto-jump to Step 3 and retry if Steps 1 & 2 are already complete in session | Implemented |

### 6.2 Chat Interface

| ID | Requirement | Status |
|----|------------|--------|
| F-CHAT-01 | Scrollable, chronological message history | Implemented |
| F-CHAT-02 | Text input with "Design" and "Edit" action buttons | Implemented |
| F-CHAT-03 | "Edit" button disabled when no screen is selected | Implemented |
| F-CHAT-04 | Loading indicator during generation/edit | Implemented |
| F-CHAT-05 | System messages include thumbnail preview of generated screen | Implemented |
| F-CHAT-06 | Conversation history persisted to Supabase `chat_history` | Implemented |
| F-CHAT-07 | "Variants" action for generating multiple design alternatives | Implemented |

### 6.3 Canvas Viewer

| ID | Requirement | Status |
|----|------------|--------|
| F-CVS-01 | Grid gallery of generated screens as clickable thumbnail cards | Implemented |
| F-CVS-02 | Clicking a thumbnail selects it and enables "Edit" | Implemented |
| F-CVS-03 | Expanded full HTML preview in a sandboxed iframe modal | Implemented |
| F-CVS-04 | Screens displayed in reverse chronological order | Implemented |
| F-CVS-05 | Each card shows thumbnail, prompt, and timestamp | Implemented |
| F-CVS-06 | Empty state shown when no screens exist yet | Implemented |

### 6.4 Backend API

| ID | Endpoint | Status |
|----|----------|--------|
| F-API-01 | `POST /api/onboard/validate-stitch` | Implemented |
| F-API-02 | `POST /api/onboard/validate-supabase` | Implemented |
| F-API-03 | `POST /api/onboard/initialize-workspace` | Implemented |
| F-API-04 | `GET /api/onboard/session-status` | Implemented |
| F-API-05 | `POST /api/generate` | Implemented |
| F-API-06 | `POST /api/edit` | Implemented |
| F-API-07 | `POST /api/variants` | Implemented |
| F-API-08 | `GET /api/screens/{project_id}` | Implemented |
| F-API-09 | `GET /api/projects` | Implemented |
| F-API-10 | `GET /api/chat-history/{project_id}` | Implemented |
| F-API-11 | `DELETE /api/screens/{screen_id}` | Implemented |

---

## 7. Non-Functional Requirements

| ID | Requirement | Status |
|----|------------|--------|
| NF-01 | Screen generation completes within 30–60 seconds | Met (Stitch latency ~20–40s) |
| NF-02 | Frontend usable on viewports 1024px and wider | Met |
| NF-03 | Credentials never stored in plaintext — encrypted session cookies | Met |
| NF-04 | Sandboxed iframe uses `sandbox` attribute to prevent script execution | Met |
| NF-05 | All API endpoints validate session authentication before processing | Met |
| NF-06 | Stitch SDK errors mapped to user-friendly messages | Met |
| NF-07 | Idempotent Supabase table creation (SQL uses `CREATE TABLE IF NOT EXISTS`) | Met |
| NF-08 | Node.js bridge has configurable timeout (default: 5 minutes) | Met |
| NF-09 | Windows compatibility: bridge uses `subprocess.run()` in `ThreadPoolExecutor` | Met |

---

## 8. Technology Stack **[UPDATED]**

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Angular 15 (NgModule-based, TypeScript) | NgModule architecture, not standalone components |
| Backend | Python FastAPI | Async, Starlette SessionMiddleware, CORS |
| UI Generation | Google Stitch SDK (`@google/stitch-sdk`) | OAuth2 only; API keys not supported |
| Authentication | Google OAuth2 via `gcloud auth print-access-token` | Tokens expire after ~1 hour |
| Database | Supabase (user-provided) | PostgreSQL; JWT anon key required |
| Node Bridge | Node.js 18+ subprocess | `subprocess.run()` in `ThreadPoolExecutor` (Windows-compatible) |
| Session Management | Starlette `SessionMiddleware` (encrypted cookies, 24h TTL) | |
| Styling | Plain SCSS (no UI framework) | Custom design system |

---

## 9. Technical Architecture

### 9.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│                   Angular Frontend                   │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │   Chat Panel      │    │   Canvas Viewer        │ │
│  │   - Prompt input  │───▶│   - Screen thumbnails  │ │
│  │   - Design/Edit   │    │   - Iframe preview     │ │
│  │   - Chat history  │    │   - Selection state    │ │
│  └────────┬─────────┘    └────────────────────────┘ │
└───────────┼─────────────────────────────────────────┘
            │ HTTP REST (withCredentials: true)
┌───────────▼─────────────────────────────────────────┐
│                  FastAPI Backend                      │
│  - /api/onboard/*     (credential validation)        │
│  - /api/generate      (new screen)                   │
│  - /api/edit          (refine screen)                │
│  - /api/variants      (multiple alternatives)        │
│  - /api/screens       (list/delete)                  │
│  - SessionMiddleware   (encrypted credentials)       │
└───────┬──────────────────────────┬──────────────────┘
        │ subprocess.run()          │ REST API
        │ (ThreadPoolExecutor)      │ (supabase-py)
┌───────▼──────────┐      ┌───────▼──────────────────┐
│  Node.js Bridge   │      │  User's Supabase         │
│  stitch-bridge.js │      │  - projects table        │
│  JSON stdin/stdout│      │  - screens table         │
│  @google/stitch-  │      │  - chat_history table    │
│  sdk              │      └──────────────────────────┘
└───────┬──────────┘
        │ HTTPS (MCP transport)
┌───────▼──────────┐
│  Google Stitch    │
│  stitch.          │
│  googleapis.com   │
└──────────────────┘
```

### 9.2 Database Schema (User-Provisioned in Supabase)

**Table: `projects`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| stitch_project_id | text | Stitch project ID returned by `createProject()` |
| title | text | Project display name (default: "My Designs") |
| created_at | timestamptz | Creation timestamp |

**Table: `screens`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| project_id | uuid | Foreign key to `projects.id` |
| stitch_screen_id | text | Screen ID returned by the Stitch SDK |
| prompt | text | The user prompt that generated this screen |
| html_url | text | Download URL for the screen's HTML |
| image_url | text | Screenshot URL for the thumbnail |
| parent_screen_id | uuid | Nullable; the screen this was edited from |
| device_type | text | MOBILE, DESKTOP, TABLET, or AGNOSTIC |
| created_at | timestamptz | Creation timestamp |

**Table: `chat_history`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| project_id | uuid | Foreign key to `projects.id` |
| role | text | "user" or "system" |
| content | text | Message text |
| screen_id | uuid | Nullable; links to the screen generated by this message |
| created_at | timestamptz | Creation timestamp |

### 9.3 Node.js Bridge Specification **[UPDATED]**

The bridge is a standalone Node.js ESM script (`stitch-bridge.js`) that FastAPI invokes via `subprocess.run()` in a `ThreadPoolExecutor`. Communication is via JSON over stdin/stdout.

**Input format (stdin):**

```json
{
  "action": "validate | create_project | generate | edit | variants",
  "access_token": "ya29.xxx",
  "project_id": "google-cloud-project-id",
  "stitch_project_id": "stitch-numeric-project-id",
  "screen_id": "stitch-screen-id (for edit/variants)",
  "prompt": "User's text prompt",
  "device_type": "DESKTOP",
  "title": "Project title (for create_project)",
  "variant_options": { "variantCount": 3 }
}
```

**Output format (stdout):**

```json
{
  "success": true,
  "screens": [
    {
      "screen_id": "abc123",
      "project_id": "14110130285973928315",
      "html_url": "https://contribution.usercontent.google.com/...",
      "image_url": "https://lh3.googleusercontent.com/...",
      "device_type": "DESKTOP"
    }
  ],
  "project": { "id": "14110130285973928315", "title": "My Designs" },
  "projects": [{ "id": "...", "title": "..." }],
  "error": null
}
```

**Key implementation details:**

- `StitchToolClient` is instantiated with `{ accessToken, projectId }` and passed to `new Stitch(toolClient)` — not constructed directly via `new Stitch({ apiKey })`.
- `project.generate(prompt, deviceType)` takes `deviceType` as a positional string, not an options object.
- `screen.edit(prompt, deviceType)` and `screen.variants(prompt, variantOptions, deviceType)` follow the same pattern.
- The bridge calls `toolClient.close()` after every action to release the MCP connection.

### 9.4 Session and Credential Management

- Credentials are collected during onboarding and stored in an encrypted server-side session via Starlette `SessionMiddleware` (signed with `SECRET_KEY`).
- Session TTL: 24 hours (configurable via `settings.SESSION_MAX_AGE`).
- Session keys stored: `stitch_access_token`, `stitch_project_id` (GCP), `supabase_url`, `supabase_anon_key`, `default_project_id`.
- After expiration, the user is redirected to onboarding. Chat history and screens in Supabase are preserved.
- `session-status` endpoint returns `resume_step` (1, 3, or 4) so the frontend can resume mid-flow.

### 9.5 Windows Compatibility **[UPDATED]**

Python's `asyncio.create_subprocess_exec` throws `NotImplementedError` on Windows when using uvicorn's default `SelectorEventLoop`. The bridge uses `subprocess.run()` (synchronous) wrapped in `concurrent.futures.ThreadPoolExecutor` to avoid blocking the event loop:

```python
_executor = ThreadPoolExecutor(max_workers=4)

def _call_bridge_sync(payload):
    result = subprocess.run(["node", bridge_path], input=json.dumps(payload),
                            capture_output=True, text=True, timeout=settings.BRIDGE_TIMEOUT)
    return json.loads(result.stdout.strip())

async def call_bridge(payload):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _call_bridge_sync, payload)
```

---

## 10. Angular Frontend Structure

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── api.service.ts              # HTTP client for FastAPI (port 8003)
│   │   │   ├── session.service.ts          # In-memory session state (BehaviorSubject)
│   │   │   └── screen-selection.service.ts # Shared selected screen state
│   │   ├── guards/
│   │   │   └── auth.guard.ts              # Redirects to /onboarding if no session
│   │   └── interceptors/
│   │       └── error.interceptor.ts       # Extracts error.detail from FastAPI 4xx/5xx
│   ├── features/
│   │   ├── onboarding/
│   │   │   ├── onboarding.component.ts    # 3-step credential form with resume logic
│   │   │   ├── onboarding.component.html
│   │   │   └── onboarding.component.scss
│   │   └── workspace/
│   │       ├── workspace.component.ts     # Split-pane; checks session on load
│   │       ├── workspace.component.html
│   │       ├── workspace.component.scss
│   │       ├── chat-panel/
│   │       └── canvas-viewer/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── screen-card/               # Thumbnail card
│   │   │   ├── loading-indicator/         # Spinner
│   │   │   └── iframe-preview/            # Sandboxed HTML preview
│   │   └── models/
│   │       ├── screen.model.ts
│   │       ├── project.model.ts
│   │       └── chat-message.model.ts
│   ├── app-routing.module.ts
│   ├── app.module.ts                      # NgModule (not standalone)
│   └── app.component.ts
└── styles.scss
```

---

## 11. FastAPI Backend Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS (localhost:4200), SessionMiddleware
│   ├── config.py                  # Settings (SECRET_KEY, BRIDGE_TIMEOUT)
│   ├── routers/
│   │   ├── onboard.py             # /api/onboard/* — validate, initialize, session-status
│   │   ├── generate.py            # /api/generate, /api/edit, /api/variants
│   │   └── screens.py             # /api/screens, /api/projects, /api/chat-history
│   ├── services/
│   │   ├── stitch_bridge.py       # subprocess.run() + ThreadPoolExecutor bridge caller
│   │   ├── supabase_client.py     # Per-user Supabase client (supabase-py)
│   │   └── session_manager.py     # Session read/write helpers
│   ├── models/
│   │   ├── requests.py            # Pydantic models (StitchValidateRequest uses access_token)
│   │   └── responses.py
│   └── migrations/
│       └── provision_tables.sql   # SQL shown in onboarding UI (run manually)
├── bridge/
│   ├── stitch-bridge.js           # ESM Node.js bridge (StitchToolClient + Stitch)
│   ├── package.json               # type: "module", @google/stitch-sdk
│   └── package-lock.json
├── requirements.txt
└── README.md
```

---

## 12. API Contract **[UPDATED]**

### POST `/api/onboard/validate-stitch`

**Request:**
```json
{
  "access_token": "ya29.xxx",
  "google_cloud_project_id": "my-gcp-project"
}
```

**Response (success):**
```json
{
  "valid": true,
  "projects": [{ "id": "14110130285973928315", "title": "Untitled" }]
}
```

### POST `/api/onboard/validate-supabase`

**Request:**
```json
{
  "supabase_url": "https://abc123.supabase.co",
  "supabase_anon_key": "eyJ..."
}
```

**Response:**
```json
{ "valid": true, "tables_provisioned": true }
```

### GET `/api/onboard/session-status`

**Response (fully authenticated):**
```json
{ "authenticated": true, "default_project_id": "uuid", "resume_step": 4 }
```

**Response (Steps 1 & 2 done, Step 3 incomplete):**
```json
{ "authenticated": true, "default_project_id": null, "resume_step": 3 }
```

**Response (not authenticated):**
```json
{ "authenticated": false, "resume_step": 1 }
```

### POST `/api/generate`

**Request:**
```json
{
  "prompt": "A login page with email and password fields",
  "project_id": "uuid-of-project",
  "device_type": "DESKTOP"
}
```

**Response:**
```json
{
  "screen": {
    "id": "uuid",
    "stitch_screen_id": "863c1e8492d540198da763ab28a1b5b6",
    "prompt": "A login page with email and password fields",
    "html_url": "https://contribution.usercontent.google.com/...",
    "image_url": "https://lh3.googleusercontent.com/...",
    "device_type": "DESKTOP",
    "parent_screen_id": null,
    "created_at": "2026-04-05T10:30:00Z"
  },
  "chat_message": {
    "role": "system",
    "content": "Screen generated successfully.",
    "screen_id": "uuid"
  }
}
```

---

## 13. Error Handling Strategy

| Error Code | User-Facing Message | Notes |
|------------|--------------------|----|
| AUTH_FAILED | "Your Stitch credentials are invalid or expired. Please update them in settings." | OAuth token expired; re-run `gcloud auth print-access-token` |
| RATE_LIMITED | "Stitch is rate-limiting requests. Please wait a moment and try again." | |
| NOT_FOUND | "The screen or project was not found in Stitch." | |
| NETWORK_ERROR | "Unable to reach Stitch servers. Check your internet connection." | |
| VALIDATION_ERROR | "Stitch couldn't process that prompt. Try rephrasing your description." | |
| TIMEOUT | "Stitch request timed out. Please try again." | Default timeout: 5 minutes |
| UNKNOWN_ERROR | "Something went wrong. Please try again." | Full error logged server-side |

The Angular `ErrorInterceptor` extracts `error.detail` from FastAPI HTTP error responses and surfaces it as `err.message` in components.

---

## 14. Assumptions and Constraints **[UPDATED]**

**Assumptions:**

- Users have a Google Cloud account and can run `gcloud auth print-access-token` to obtain OAuth2 tokens.
- Users have created a Supabase project and can access the SQL Editor to run the migration.
- The Stitch SDK's `getHtml()` and `getImage()` return accessible URLs (they do, via Google's CDN).
- Stitch API latency for screen generation is typically 20–40 seconds.

**Constraints:**

- **OAuth tokens expire after ~1 hour.** Users must re-onboard when their token expires.
- **Supabase JWT anon key required.** The `sb_publishable_` format is not supported by `supabase-py`.
- **Tables must be created manually.** Supabase does not expose a `/rpc/exec_sql` endpoint for programmatic DDL.
- The Stitch SDK is TypeScript-only, requiring the Node.js subprocess bridge.
- The application is desktop-focused (minimum viewport: 1024px).
- The `asyncio` subprocess API is not available on Windows — `subprocess.run()` in `ThreadPoolExecutor` is used instead.

---

## 15. Risks and Mitigations **[UPDATED]**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OAuth token expires mid-session | High | Medium | Surface clear AUTH_FAILED error; show instructions to get fresh token |
| Stitch SDK breaking changes | Medium | Critical | Bridge is isolated; only `stitch-bridge.js` needs updating |
| Stitch HTML/image URLs expire | Medium | High | Future: cache content in Supabase Storage on generation |
| Supabase RLS policies blocking inserts | Medium | Medium | Documented in onboarding; error messages surface Supabase detail |
| Node.js bridge subprocess crashes | Low | High | Timeout handling, structured error propagation, stderr logging |
| Port conflicts on Windows | Medium | Low | Use any free port; frontend BASE_URL is a single constant to update |

---

## 16. Future Enhancements (Post-MVP)

| Feature | Description | Priority |
|---------|------------|----------|
| Token refresh flow | Auto-detect expired OAuth token and prompt re-authentication without losing workspace state | P0 |
| Token persistence | Store the token in the session and surface a "refresh token" button in the workspace nav | P1 |
| Multi-project support | Allow users to create and switch between multiple Stitch projects | P1 |
| Screen export | Download generated HTML as a standalone file or PNG | P1 |
| Device type selector | Let users choose MOBILE, DESKTOP, TABLET in the chat panel | P1 |
| Supabase auto-provisioning | Use Supabase Management API (with service role key) to create tables programmatically | P1 |
| Collaborative sharing | Share a read-only link to the canvas viewer for stakeholder review | P2 |
| Screen version tree | Visualize the edit history as a branching tree | P2 |
| Real-time sync | Use Supabase real-time subscriptions to sync canvas across browser tabs | P3 |

---

## 17. Glossary

| Term | Definition |
|------|-----------|
| Stitch SDK | Google's `@google/stitch-sdk` npm package that generates UI screens from text prompts |
| StitchToolClient | The low-level MCP transport client; accepts `{ accessToken, projectId }` |
| Stitch | The high-level wrapper class; constructed as `new Stitch(toolClient)` |
| MCP | Model Context Protocol; communication protocol used by the Stitch SDK |
| OAuth2 Access Token | A short-lived Google credential (`ya29.xxx`) obtained via `gcloud auth print-access-token` |
| GCP Project ID | Google Cloud project ID (e.g., `my-project-123`) where the Stitch API is enabled |
| Screen | A single generated UI design: an HTML file + screenshot image |
| Canvas | The right panel; a read-only gallery for viewing generated screens |
| Node Bridge | `stitch-bridge.js` — Node.js script invoked by FastAPI via `subprocess.run()` |
| Supabase | PostgreSQL-backed BaaS; user-provided; requires JWT anon key (`eyJ...`) |
| ThreadPoolExecutor | Python's `concurrent.futures.ThreadPoolExecutor`; used to run synchronous subprocess calls without blocking the async event loop |

---

## 18. Acceptance Criteria (MVP — Achieved)

1. ✅ A new user can open the application, complete the 3-step onboarding with their Stitch OAuth token and Supabase credentials, and be redirected to the workspace.
2. ✅ The user can type a screen description in the chat panel, click "Design," and see the generated screen appear on the canvas within 60 seconds.
3. ✅ The user can select a screen on the canvas, type an edit instruction, click "Edit," and see the updated screen appear on the canvas.
4. ✅ All generated screens persist across browser sessions (stored in the user's Supabase).
5. ✅ Chat history is preserved and displayed when returning to the workspace.
6. ✅ Invalid credentials during onboarding produce clear, actionable error messages showing the actual error detail.
7. ✅ Stitch SDK errors during generation produce user-friendly messages in the chat panel.
8. ✅ If onboarding is partially complete, the app resumes from the correct step automatically.
9. ✅ The workspace detects a missing session and shows a "Complete Onboarding" prompt instead of an unhelpful blank screen.
