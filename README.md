# Stitch Integration

Generate UI screen designs from plain English descriptions — no design skills needed.

---

## What You'll Need

Before you start, you need to set up two free services. This guide walks you through both, step by step.

| Service | What it's for | Cost |
|---------|--------------|------|
| Google Cloud + Stitch | The AI that generates your screens | Free (with a Google account) |
| Supabase | Saves your designs and history | Free |

---

## Part 1 — Set Up Google Cloud & Stitch

This gives the app permission to generate screens using Google's AI.

### Step 1 — Install Google Cloud SDK

The Google Cloud SDK is a small program that lets you log in to Google from your computer.

1. Go to: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
2. Click **"Windows"** (or your operating system)
3. Download the installer and run it
4. Click through the installer — keep all the default options
5. At the end, leave the checkboxes ticked and click **Finish** — this opens a setup window

> If you already have it installed, skip to Step 2.

### Step 2 — Log In to Google

1. Open **Google Cloud SDK Shell** from your Start menu (search for it)
2. Type this and press Enter:
   ```
   gcloud auth login
   ```
3. A browser window will open — sign in with your Google account
4. Click **"Allow"** when asked for permissions
5. You'll see "You are now authenticated" — go back to the terminal

### Step 3 — Create a Google Cloud Project

A "project" is just a container that groups your usage together.

1. In the same terminal, type this (replace `my-project-name` with anything you like, lowercase letters and hyphens only):
   ```
   gcloud projects create my-project-name
   ```
   Example: `gcloud projects create stitch-designs-jane`

2. Set it as your active project:
   ```
   gcloud config set project my-project-name
   ```

3. Go to [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) and link a billing account to the project
   > Don't worry — **you won't be charged**. Google requires a billing account to enable APIs, but Stitch usage is free.

### Step 4 — Enable the Stitch API

1. Go to this link (replace `my-project-name` with your actual project name):
   ```
   https://console.cloud.google.com/apis/library/stitch.googleapis.com?project=my-project-name
   ```
2. Click the blue **"Enable"** button
3. Wait a few seconds for it to activate

### Step 5 — Get Your Access Token

Every time you open the app, you need a fresh login token. Here's how to get one:

1. Open **Google Cloud SDK Shell** from your Start menu
2. Type this and press Enter:
   ```
   gcloud auth print-access-token
   ```
3. A long string starting with `ya29.` will appear — **copy the entire thing**

> **Important:** This token expires after 1 hour. If the app shows an authentication error, just run this command again to get a new one.

---

## Part 2 — Set Up Supabase

Supabase is a free database that stores your generated screens and chat history.

### Step 1 — Create a Free Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with your GitHub or email account

### Step 2 — Create a New Project

1. Once logged in, click **"New project"**
2. Fill in:
   - **Name:** anything you like (e.g., `stitch-studio`)
   - **Database Password:** choose a strong password and save it somewhere
   - **Region:** pick the one closest to you
3. Click **"Create new project"**
4. Wait 1–2 minutes while Supabase sets up your database (you'll see a loading screen)

### Step 3 — Run the Database Setup Script

This creates the tables the app needs to store your designs.

1. In your Supabase project, look at the left sidebar and click **"SQL Editor"**

   ![SQL Editor is in the left sidebar]

2. Click **"New query"** (top left of the editor)

3. Click inside the empty text box, then press **Ctrl+A** to clear it

4. Copy and paste the entire block below into the box:

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

5. Click the green **"Run"** button (or press **Ctrl+Enter**)

6. You should see **"Success. No rows returned"** at the bottom — this is correct, it means it worked

### Step 4 — Get Your Project URL and API Key

These are like the address and password the app uses to connect to your database.

1. In the left sidebar, click the **gear icon (⚙️)** at the very bottom — this opens **Project Settings**
2. Click **"API"** in the settings menu
3. You'll see two things to copy:

   **Project URL** — looks like `https://abcdefgh.supabase.co`
   - Click the **"Copy"** button next to it

   **Anon key** — a very long string starting with `eyJhbGci...`
   - Under "Project API keys", find the row labelled **anon** and **public**
   - Click **"Copy"** next to it

> Make sure you copy the **anon** key, not the **service_role** key. The anon key is safe to use in apps.

---

## Part 3 — Run the App

### Start the Backend

1. Open a terminal in the `backend` folder
2. Run:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   cd bridge && npm install && cd ..
   uvicorn app.main:app --port 8003
   ```

### Start the Frontend

1. Open a second terminal in the `frontend` folder
2. Run:
   ```bash
   npm install
   ng serve
   ```

3. Open [http://localhost:4200](http://localhost:4200) in your browser

---

## Part 4 — Complete Onboarding (First Time Only)

When you first open the app, you'll go through a 3-step setup.

### Step 1 of 3 — Connect Google Stitch

1. Go to **Google Cloud SDK Shell** and run:
   ```
   gcloud auth print-access-token
   ```
2. Copy the token that appears (`ya29.xxx...`)
3. Paste it into the **"OAuth Access Token"** field
4. For **"Google Cloud Project ID"**, run this and copy the output:
   ```
   gcloud config get-value project
   ```
5. Click **"Validate & Continue"** — this takes about 10 seconds

### Step 2 of 3 — Connect Supabase

1. Paste your **Project URL** (from Part 2, Step 4) into the first field
2. Paste your **Anon key** into the second field
3. Click **"Connect & Continue"**

### Step 3 of 3 — Setting Up Your Workspace

The app automatically creates your design workspace. This takes about 20–30 seconds. When it's done, you'll be taken to the workspace automatically.

---

## Part 5 — Generating Screens

Once you're in the workspace, you'll see a split screen:
- **Left side** — chat where you type your design requests
- **Right side** — canvas where your generated screens appear

### Generate a New Screen

1. Type a description in the chat box at the bottom left
   - Example: *"A sign-in page with email and password, blue and white colour scheme"*
   - Example: *"A mobile dashboard showing sales metrics with charts"*
2. Click **"Design"**
3. Wait 20–40 seconds — the screen will appear on the right side when ready

### Edit an Existing Screen

1. Click any screen on the right side to select it (it gets a blue border)
2. Type your changes in the chat box
   - Example: *"Change the background to dark grey"*
   - Example: *"Add a logo placeholder at the top"*
3. Click **"Edit"**

### View a Screen in Full Size

1. Click any screen thumbnail on the right side
2. A full-size preview will open
3. Click anywhere outside it (or the X button) to close

### Generate Variations

1. Select a screen on the right side
2. Type what kind of variations you want
   - Example: *"Show me 3 different colour schemes for this"*
3. Click **"Variants"** — three new versions will appear

---

## Troubleshooting

**"Authentication error" or "token expired"**
Your Google token has expired (they last 1 hour). Go to Google Cloud SDK Shell and run `gcloud auth print-access-token`, then go back through onboarding with the new token.

**"Invalid API key" on Supabase step**
You used the wrong key. Make sure you copied the **anon** key (starts with `eyJ...`), not the publishable or service key.

**Step 3 fails with a database error**
Make sure you ran the SQL script in Part 2, Step 3 before clicking "Connect & Continue".

**"gcloud is not recognized"**
Open **Google Cloud SDK Shell** from the Start menu instead of a regular Command Prompt or PowerShell window.

**The screen takes too long or shows an error**
Try rephrasing your prompt. Keep it clear and specific. If it still fails, click "Retry" or try again with a slightly different description.
