#!/usr/bin/env node
/**
 * Database migration runner.
 * Runs during build to ensure schema is initialized.
 * Idempotent: safe to run multiple times.
 */
import { createClient } from "@vercel/postgres"

const client = createClient()

const schema = `
-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  org_id UUID REFERENCES organizations(id),
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Engagements
CREATE TABLE IF NOT EXISTS engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  frameworks TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'planning',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workpapers
CREATE TABLE IF NOT EXISTS workpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  control_id TEXT NOT NULL,
  implementation_status TEXT,
  test_result TEXT,
  residual_risk TEXT,
  exceptions_noted TEXT,
  conclusion TEXT,
  prepared_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  signed_off_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workpaper Versions
CREATE TABLE IF NOT EXISTS workpaper_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID NOT NULL REFERENCES workpapers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID NOT NULL REFERENCES workpapers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT,
  description TEXT,
  ai_score FLOAT,
  ai_feedback TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Findings
CREATE TABLE IF NOT EXISTS findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  control_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  raised_date DATE DEFAULT CURRENT_DATE,
  target_remediation_date DATE,
  remediated_date DATE,
  raised_by UUID NOT NULL REFERENCES users(id),
  owner UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Remediation Actions
CREATE TABLE IF NOT EXISTS remediation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_date DATE,
  status TEXT DEFAULT 'open',
  evidence_id UUID REFERENCES evidence(id),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES findings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engagements_org_id ON engagements(org_id);
CREATE INDEX IF NOT EXISTS idx_workpapers_engagement_id ON workpapers(engagement_id);
CREATE INDEX IF NOT EXISTS idx_workpaper_versions_workpaper_id ON workpaper_versions(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_evidence_workpaper_id ON evidence(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_findings_engagement_id ON findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_engagement_id ON audit_log(engagement_id);
CREATE INDEX IF NOT EXISTS idx_comments_workpaper_id ON comments(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_comments_finding_id ON comments(finding_id);
`

async function migrate() {
  try {
    await client.connect()
    console.log("📦 Running database migrations...")

    // Split by semicolon and execute each statement
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const statement of statements) {
      await client.sql([statement])
    }

    console.log("✅ Migrations complete")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrate()
