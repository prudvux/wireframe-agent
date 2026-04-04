-- Auto-provisioned by Stitch Design Studio

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
