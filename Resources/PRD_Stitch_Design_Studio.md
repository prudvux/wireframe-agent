# Product Requirements Document: Stitch Design Studio

**Version:** 1.0  
**Date:** April 4, 2026  
**Author:** [Your Name]  
**Status:** Draft

---

## 1. Executive summary

Stitch Design Studio is a web application that combines an AI-powered chat interface with a read-only design canvas to enable users to generate, iterate on, and manage UI screen designs using Google's Stitch SDK. Users describe screens in natural language through a chat panel, and the generated designs appear automatically on an adjacent canvas viewer — creating a seamless prompt-to-screen workflow without requiring any design tool expertise.

---

## 2. Problem statement

Designers and non-designers alike face a gap between imagining a UI and producing one. Traditional design tools (Figma, Sketch) require significant skill. Existing AI design tools often operate as black boxes with no iterative refinement. There is no product today that combines conversational AI interaction with programmatic UI generation from Google Stitch in a unified workspace where users can generate, refine, and review screens in one place.

---

## 3. Goals and objectives

| Goal | Success metric |
|------|---------------|
| Enable non-designers to produce production-quality UI screens from text prompts | User can go from prompt to rendered screen in under 60 seconds |
| Support iterative refinement through conversational editing | Users can edit a generated screen via follow-up prompts without starting over |
| Provide a persistent workspace with full design history | All generated screens and chat history are retrievable across sessions |
| Deliver a self-service onboarding experience | Users configure their own Stitch and Supabase credentials with zero developer intervention |

---

## 4. Target users

**Primary:** Product managers, startup founders, and UX researchers who need to rapidly prototype UI concepts without design tool proficiency.

**Secondary:** Frontend developers who want to generate starter UI scaffolds from descriptions before coding. Freelance designers who want AI-assisted ideation for client projects.

---

## 5. User flow

### 5.1 Onboarding

The application has no pre-configured backend database or API keys. Each user brings their own credentials.

**Step 1 — Stitch authentication**

- User is presented with an input field for their Stitch API key.
- Optionally, a Google Cloud Project ID field is shown for OAuth-based authentication.
- On clicking "Validate," the backend calls the Stitch SDK (`stitch.projects()`) to verify the key.
- If validation fails, an inline error is displayed with a link to the Stitch documentation for obtaining a key.
- If validation succeeds, a green confirmation indicator appears and Step 2 becomes active.

**Step 2 — Supabase configuration**

- User enters their Supabase project URL and anon (public) key.
- On clicking "Connect," the backend tests connectivity by running a lightweight query against the Supabase REST API.
- If validation fails, an inline error is shown.
- If validation succeeds, the backend auto-provisions the required database tables (see Section 9.2) in the user's Supabase instance if they do not already exist.

**Step 3 — Workspace initialization**

- The backend creates a default Stitch project (`stitch.callTool("create_project", { title: "My Designs" })`).
- The project ID is stored in the user's Supabase `projects` table.
- Credentials are saved to an encrypted server-side session.
- The user is redirected to the design workspace.

### 5.2 Design workspace

The workspace is a split-pane layout occupying the full viewport.

**Left panel — Chat interface (40% width)**

- A scrollable message list showing the conversation history between the user and the system.
- A text input area at the bottom with two action buttons:
  - **"Design"** — Sends the prompt as a new screen generation request.
  - **"Edit"** — Sends the prompt as an edit instruction for the currently selected screen on the canvas. This button is disabled when no screen is selected.
- Messages from the system include a loading state while Stitch processes the request, followed by a confirmation message with a thumbnail of the generated screen.
- The chat supports the following interaction types:
  - **Generate**: "Design a login page with email and password fields"
  - **Edit**: (with a screen selected) "Make the background dark and add a sidebar"
  - **Variants**: "Show me 3 different color schemes for this screen"

**Right panel — Canvas viewer (60% width)**

- A read-only gallery of all generated screens for the current project.
- Each screen is displayed as a clickable thumbnail card (using the Stitch screenshot URL).
- Clicking a thumbnail selects that screen (highlighted border) and enables the "Edit" button in the chat panel.
- A selected screen can be expanded into a full-preview mode that renders the actual HTML in a sandboxed iframe.
- Screens are displayed in reverse chronological order (newest first).
- Each screen card shows: the thumbnail image, the prompt used to generate it, and a timestamp.

### 5.3 Screen generation lifecycle

1. User types a screen description in the chat input.
2. User clicks "Design."
3. The Angular frontend sends a POST request to FastAPI with the prompt text and project ID.
4. FastAPI invokes the Node.js bridge script, which calls `project.generate(prompt)` via the Stitch SDK.
5. Stitch processes the prompt and returns a Screen object.
6. The Node bridge calls `screen.getHtml()` and `screen.getImage()` to obtain the HTML download URL and screenshot download URL.
7. The Node bridge returns both URLs plus the Stitch screen ID to FastAPI.
8. FastAPI stores the screen metadata (screen ID, project ID, prompt, HTML URL, image URL, timestamp) in the user's Supabase `screens` table.
9. FastAPI returns the full screen payload to the Angular frontend.
10. The frontend appends a success message to the chat and adds the new screen thumbnail to the canvas.

### 5.4 Screen editing lifecycle

1. User selects an existing screen on the canvas by clicking its thumbnail.
2. User types an edit instruction in the chat input.
3. User clicks "Edit."
4. The Angular frontend sends a POST request to FastAPI with the edit prompt and the selected screen's Stitch screen ID.
5. FastAPI invokes the Node bridge, which calls `screen.edit(prompt)` via the Stitch SDK.
6. Stitch returns a new Screen object (the edited version).
7. The same extraction and storage process from steps 6–10 of Section 5.3 applies.
8. The canvas adds the edited screen as a new entry (the original screen is preserved in history).

### 5.5 Variant generation

1. User selects an existing screen on the canvas.
2. User types a variant instruction (e.g., "Try different layouts").
3. User clicks "Design" (variants are treated as a generation action).
4. The backend calls `screen.variants(prompt, { variantCount: 3 })`.
5. Multiple screens are returned and each is stored and displayed on the canvas.

---

## 6. Functional requirements

### 6.1 Onboarding module

| ID | Requirement | Priority |
|----|------------|----------|
| F-ONB-01 | The app shall display a multi-step onboarding form collecting Stitch API key and Supabase credentials | P0 |
| F-ONB-02 | The app shall validate the Stitch API key by attempting to list projects via the Stitch SDK | P0 |
| F-ONB-03 | The app shall validate Supabase credentials by performing a test REST API call | P0 |
| F-ONB-04 | The app shall auto-provision required database tables in the user's Supabase instance on first connection | P0 |
| F-ONB-05 | The app shall display clear error messages with remediation links when validation fails | P0 |
| F-ONB-06 | The app shall store validated credentials in an encrypted server-side session | P0 |
| F-ONB-07 | The app shall support both API key and OAuth (access token + project ID) authentication for Stitch | P1 |

### 6.2 Chat interface

| ID | Requirement | Priority |
|----|------------|----------|
| F-CHAT-01 | The chat panel shall display a scrollable, chronological message history | P0 |
| F-CHAT-02 | The chat panel shall provide a text input with "Design" and "Edit" action buttons | P0 |
| F-CHAT-03 | The "Edit" button shall be disabled when no screen is selected on the canvas | P0 |
| F-CHAT-04 | The chat shall display a loading indicator while a generation or edit request is in progress | P0 |
| F-CHAT-05 | System messages shall include a thumbnail preview of the generated screen | P1 |
| F-CHAT-06 | The chat shall persist conversation history to the user's Supabase `chat_history` table | P1 |
| F-CHAT-07 | The chat shall support a "Variants" action for generating multiple design alternatives | P2 |

### 6.3 Canvas viewer

| ID | Requirement | Priority |
|----|------------|----------|
| F-CVS-01 | The canvas shall display all generated screens as clickable thumbnail cards in a grid layout | P0 |
| F-CVS-02 | Clicking a thumbnail shall select the screen (visual highlight) and enable the "Edit" button | P0 |
| F-CVS-03 | A selected screen shall be expandable into a full HTML preview rendered in a sandboxed iframe | P0 |
| F-CVS-04 | Screens shall be displayed in reverse chronological order | P0 |
| F-CVS-05 | Each screen card shall show the thumbnail, the generation prompt, and a timestamp | P0 |
| F-CVS-06 | The canvas shall auto-scroll or highlight new screens when they are generated | P1 |
| F-CVS-07 | The canvas shall support switching between grid view and single-screen expanded view | P2 |

### 6.4 Backend API

| ID | Requirement | Priority |
|----|------------|----------|
| F-API-01 | POST `/api/onboard/validate-stitch` — Validate Stitch credentials and return project list | P0 |
| F-API-02 | POST `/api/onboard/validate-supabase` — Validate Supabase credentials and provision tables | P0 |
| F-API-03 | POST `/api/generate` — Accept a prompt and project ID, generate a screen via Stitch, store in Supabase, return screen payload | P0 |
| F-API-04 | POST `/api/edit` — Accept a prompt and screen ID, edit the screen via Stitch, store result, return updated payload | P0 |
| F-API-05 | GET `/api/screens/{project_id}` — Return all screens for a project from Supabase | P0 |
| F-API-06 | GET `/api/projects` — Return all projects for the current session | P1 |
| F-API-07 | POST `/api/variants` — Accept a prompt, screen ID, and variant options; return multiple screen payloads | P2 |
| F-API-08 | DELETE `/api/screens/{screen_id}` — Remove a screen from Supabase (does not delete from Stitch) | P2 |

---

## 7. Non-functional requirements

| ID | Requirement | Category |
|----|------------|----------|
| NF-01 | Screen generation shall complete within 30 seconds (Stitch API latency + processing) | Performance |
| NF-02 | The frontend shall be responsive and usable on viewports 1024px and wider | Responsiveness |
| NF-03 | Stitch API keys and Supabase credentials shall never be stored in plaintext on the server | Security |
| NF-04 | The sandboxed iframe for HTML preview shall use the `sandbox` attribute to prevent script execution in generated HTML | Security |
| NF-05 | All API endpoints shall validate session authentication before processing requests | Security |
| NF-06 | The application shall handle Stitch SDK errors gracefully with user-friendly messages mapped to error codes (AUTH_FAILED, RATE_LIMITED, etc.) | Reliability |
| NF-07 | The application shall function correctly if Supabase tables already exist (idempotent provisioning) | Reliability |
| NF-08 | The Node.js bridge process shall have a 5-minute timeout to accommodate slow Stitch generations | Reliability |

---

## 8. Technology stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | Angular 17+ (TypeScript) | Client requirement; strong typing, modular architecture |
| Backend | Python FastAPI | Client requirement; async support, fast API development |
| UI generation | Google Stitch SDK (`@google/stitch-sdk`) | Core product dependency; generates HTML + screenshots from prompts |
| Database | Supabase (user-provided) | Client requirement; PostgreSQL-backed, REST API, real-time capabilities |
| Node bridge | Node.js 18+ subprocess | Required because Stitch SDK is TypeScript-native; FastAPI calls it via subprocess |
| Session management | FastAPI session middleware with encrypted cookies | Stateless server, credentials persist across requests |
| Styling | Angular Material or Tailwind CSS | Rapid UI development with consistent design system |

---

## 9. Technical architecture

### 9.1 System overview

```
┌─────────────────────────────────────────────────────┐
│                   Angular Frontend                   │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │   Chat Panel      │    │   Canvas Viewer        │ │
│  │   - Prompt input  │───▶│   - Screen thumbnails  │ │
│  │   - Design/Edit   │    │   - Iframe preview     │ │
│  │   - Chat history  │    │   - Selection state     │ │
│  └────────┬─────────┘    └────────────────────────┘ │
└───────────┼─────────────────────────────────────────┘
            │ HTTP (REST)
┌───────────▼─────────────────────────────────────────┐
│                  FastAPI Backend                      │
│  - /api/onboard/*     (credential validation)        │
│  - /api/generate      (new screen)                   │
│  - /api/edit          (refine screen)                │
│  - /api/screens       (list screens)                 │
│  - Session middleware  (encrypted credentials)       │
└───────┬──────────────────────────┬──────────────────┘
        │ subprocess                │ REST API
┌───────▼──────────┐      ┌───────▼──────────────────┐
│  Node.js Bridge   │      │  User's Supabase         │
│  - stitch-sdk     │      │  - projects table        │
│  - JSON stdin/out │      │  - screens table          │
│                   │      │  - chat_history table     │
└───────┬──────────┘      └──────────────────────────┘
        │ HTTPS
┌───────▼──────────┐
│  Google Stitch    │
│  MCP Server       │
│  (googleapis.com) │
└──────────────────┘
```

### 9.2 Database schema (auto-provisioned in user's Supabase)

**Table: `projects`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| stitch_project_id | text | Stitch project ID |
| title | text | Project display name |
| created_at | timestamptz | Creation timestamp |

**Table: `screens`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| project_id | uuid | Foreign key to `projects.id` |
| stitch_screen_id | text | Stitch screen ID |
| prompt | text | The user prompt that generated this screen |
| html_url | text | Download URL for the screen's HTML |
| image_url | text | Download URL for the screen's screenshot |
| parent_screen_id | uuid | Nullable; references the screen this was edited from |
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

### 9.3 Node.js bridge specification

The bridge is a standalone Node.js script (`stitch-bridge.js`) that FastAPI invokes as a subprocess. Communication happens via JSON over stdin/stdout.

**Input format (stdin):**

```json
{
  "action": "generate | edit | variants | validate | list_screens",
  "api_key": "user's Stitch API key",
  "project_id": "Stitch project ID",
  "screen_id": "Stitch screen ID (for edit/variants)",
  "prompt": "User's text prompt",
  "device_type": "DESKTOP",
  "variant_options": {
    "variantCount": 3,
    "creativeRange": "EXPLORE",
    "aspects": ["COLOR_SCHEME", "LAYOUT"]
  }
}
```

**Output format (stdout):**

```json
{
  "success": true,
  "screens": [
    {
      "screen_id": "abc123",
      "project_id": "xyz789",
      "html_url": "https://...",
      "image_url": "https://..."
    }
  ],
  "error": null
}
```

**Error output:**

```json
{
  "success": false,
  "screens": [],
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid API key",
    "recoverable": false
  }
}
```

### 9.4 Session and credential management

- Credentials (Stitch API key, Supabase URL, Supabase anon key) are collected during onboarding and stored in an encrypted server-side session using FastAPI's `itsdangerous` signed cookies or a similar mechanism.
- The session has a configurable TTL (default: 24 hours). After expiration, the user is redirected to the onboarding screen.
- Credentials are never logged, never stored in plaintext, and never returned to the frontend after initial submission.
- Each API request reads credentials from the session and passes them to the Node bridge or Supabase client as needed.

---

## 10. Angular frontend structure

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── api.service.ts            # HTTP client for FastAPI
│   │   │   ├── session.service.ts         # Session state management
│   │   │   └── screen-selection.service.ts # Shared state for selected screen
│   │   ├── guards/
│   │   │   └── auth.guard.ts             # Redirects to onboarding if no session
│   │   └── interceptors/
│   │       └── error.interceptor.ts      # Global error handling
│   ├── features/
│   │   ├── onboarding/
│   │   │   ├── onboarding.component.ts   # Multi-step credential form
│   │   │   ├── onboarding.component.html
│   │   │   └── onboarding.component.scss
│   │   └── workspace/
│   │       ├── workspace.component.ts    # Split-pane container
│   │       ├── workspace.component.html
│   │       ├── workspace.component.scss
│   │       ├── chat-panel/
│   │       │   ├── chat-panel.component.ts
│   │       │   ├── chat-panel.component.html
│   │       │   └── chat-panel.component.scss
│   │       └── canvas-viewer/
│   │           ├── canvas-viewer.component.ts
│   │           ├── canvas-viewer.component.html
│   │           └── canvas-viewer.component.scss
│   ├── shared/
│   │   ├── components/
│   │   │   ├── screen-card/              # Thumbnail card for a screen
│   │   │   ├── loading-indicator/        # Spinner/skeleton for generation
│   │   │   └── iframe-preview/           # Sandboxed HTML preview
│   │   └── models/
│   │       ├── screen.model.ts
│   │       ├── project.model.ts
│   │       └── chat-message.model.ts
│   ├── app.routes.ts
│   └── app.component.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles.scss
```

---

## 11. FastAPI backend structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app initialization, CORS, session middleware
│   ├── config.py                  # Environment and session configuration
│   ├── routers/
│   │   ├── onboard.py             # /api/onboard/* routes
│   │   ├── generate.py            # /api/generate, /api/edit, /api/variants routes
│   │   └── screens.py             # /api/screens, /api/projects routes
│   ├── services/
│   │   ├── stitch_bridge.py       # Subprocess manager for Node.js bridge
│   │   ├── supabase_client.py     # Dynamic Supabase client (per-user credentials)
│   │   └── session_manager.py     # Encrypted session read/write
│   ├── models/
│   │   ├── requests.py            # Pydantic request models
│   │   └── responses.py           # Pydantic response models
│   └── migrations/
│       └── provision_tables.sql   # SQL for auto-provisioning Supabase tables
├── bridge/
│   ├── stitch-bridge.js           # Node.js bridge script
│   ├── package.json
│   └── package-lock.json
├── requirements.txt
└── README.md
```

---

## 12. API contract

### POST `/api/onboard/validate-stitch`

**Request:**
```json
{
  "api_key": "STITCH_API_KEY_HERE",
  "google_cloud_project_id": "optional-project-id"
}
```

**Response (success):**
```json
{
  "valid": true,
  "projects": [
    { "id": "4044680601076201931", "title": "Existing Project" }
  ]
}
```

**Response (failure):**
```json
{
  "valid": false,
  "error": "AUTH_FAILED: Invalid API key. Visit https://stitch.withgoogle.com/docs to obtain a key."
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

**Response (success):**
```json
{
  "valid": true,
  "tables_provisioned": true
}
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
    "stitch_screen_id": "stitch-abc123",
    "prompt": "A login page with email and password fields",
    "html_url": "https://storage.googleapis.com/...",
    "image_url": "https://storage.googleapis.com/...",
    "device_type": "DESKTOP",
    "created_at": "2026-04-04T10:30:00Z"
  },
  "chat_message": {
    "role": "system",
    "content": "Screen generated successfully.",
    "screen_id": "uuid"
  }
}
```

### POST `/api/edit`

**Request:**
```json
{
  "prompt": "Make the background dark and add a sidebar",
  "screen_id": "uuid-of-screen-to-edit",
  "project_id": "uuid-of-project"
}
```

**Response:** Same structure as `/api/generate`, with `parent_screen_id` populated.

### GET `/api/screens/{project_id}`

**Response:**
```json
{
  "screens": [
    {
      "id": "uuid",
      "stitch_screen_id": "stitch-abc123",
      "prompt": "A login page with email and password fields",
      "html_url": "https://...",
      "image_url": "https://...",
      "parent_screen_id": null,
      "device_type": "DESKTOP",
      "created_at": "2026-04-04T10:30:00Z"
    }
  ]
}
```

---

## 13. Error handling strategy

| Stitch error code | User-facing message | Action |
|-------------------|--------------------|---------| 
| AUTH_FAILED | "Your Stitch API key is invalid or expired. Please update it in settings." | Redirect to onboarding |
| RATE_LIMITED | "Stitch is rate-limiting requests. Please wait a moment and try again." | Show retry button with countdown |
| NOT_FOUND | "The screen or project was not found in Stitch. It may have been deleted externally." | Remove from canvas, refresh list |
| NETWORK_ERROR | "Unable to reach Stitch servers. Check your internet connection." | Show retry button |
| VALIDATION_ERROR | "Stitch couldn't process that prompt. Try rephrasing your description." | Keep chat input focused |
| UNKNOWN_ERROR | "Something went wrong. Please try again." | Log error details server-side |

---

## 14. Assumptions and constraints

**Assumptions:**

- Users will obtain their own Stitch API key from stitch.withgoogle.com before using the application.
- Users will create their own Supabase project before onboarding.
- The Stitch SDK's `getHtml()` returns a publicly accessible download URL that can be loaded in an iframe.
- The Stitch SDK's `getImage()` returns a publicly accessible screenshot URL suitable for use as an `<img>` src.
- The Stitch API latency for screen generation is under 30 seconds for typical prompts.

**Constraints:**

- The Stitch SDK is TypeScript-only, requiring a Node.js subprocess bridge since the backend is Python FastAPI.
- The application is desktop-focused (minimum viewport: 1024px) due to the split-pane layout.
- The Stitch SDK is not an officially supported Google product and may have breaking changes, rate limits, or access restrictions.
- Generated HTML URLs from Stitch may have expiration times; the application does not currently cache or mirror HTML content.

---

## 15. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stitch SDK access is revoked or deprecated | Medium | Critical | Abstract Stitch calls behind a service interface so an alternative generator can be swapped in |
| Stitch HTML/image URLs expire | Medium | High | Cache HTML content in Supabase storage or download on generation |
| Node.js bridge subprocess crashes | Low | High | Implement process restart logic, timeout handling, and structured error propagation |
| User's Supabase instance has RLS policies blocking table creation | Medium | Medium | Document required Supabase permissions in onboarding; detect and surface specific errors |
| Session cookie expires mid-workflow | Low | Medium | Auto-detect expired sessions and prompt re-authentication without losing chat history |

---

## 16. Future enhancements (post-MVP)

| Feature | Description | Priority |
|---------|------------|----------|
| Multi-project support | Allow users to create and switch between multiple Stitch projects | P1 |
| Screen export | Download generated HTML as a standalone file or export as a PNG | P1 |
| Device type selector | Let users choose between MOBILE, DESKTOP, TABLET, and AGNOSTIC in the chat panel | P1 |
| Collaborative sharing | Share a read-only link to the canvas viewer for stakeholder review | P2 |
| Screen version tree | Visualize the edit history as a branching tree (original → edit → variant) | P2 |
| Local credential storage | Option to store encrypted credentials in browser for faster re-authentication | P2 |
| Stitch OAuth flow | Implement full Google OAuth instead of requiring manual API key entry | P2 |
| Real-time sync | Use Supabase real-time subscriptions to sync canvas updates across browser tabs | P3 |

---

## 17. Glossary

| Term | Definition |
|------|-----------|
| Stitch SDK | Google's `@google/stitch-sdk` npm package that generates UI screens from text prompts via an MCP server |
| MCP | Model Context Protocol; the communication protocol used by the Stitch SDK to talk to Google's generation servers |
| Screen | A single generated UI design, consisting of an HTML file and a screenshot image |
| Canvas | The right panel of the workspace; a read-only gallery for viewing generated screens |
| Node bridge | A lightweight Node.js script that FastAPI calls as a subprocess to invoke the TypeScript Stitch SDK |
| Supabase | An open-source Firebase alternative providing a PostgreSQL database with REST API; user-provided in this application |
| Onboarding | The initial setup flow where users provide their Stitch and Supabase credentials |

---

## 18. Acceptance criteria

The MVP is considered complete when:

1. A new user can open the application, enter valid Stitch and Supabase credentials, and be redirected to the workspace without errors.
2. The user can type a screen description in the chat panel, click "Design," and see the generated screen appear on the canvas within 60 seconds.
3. The user can select a screen on the canvas, type an edit instruction, click "Edit," and see the updated screen appear on the canvas.
4. All generated screens persist across browser sessions (stored in the user's Supabase).
5. Chat history is preserved and displayed when returning to the workspace.
6. Invalid credentials during onboarding produce clear, actionable error messages.
7. Stitch SDK errors during generation produce user-friendly messages in the chat panel.
