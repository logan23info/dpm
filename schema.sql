-- DPM Canonical Schema — Single Source of Truth
-- Represents actual Neon DB state after all sprint migrations
-- Generated: 2026-09-13
-- RULE: Every API route column reference must match this file.

-- ── Core Auth (better-auth manages these) ────────────────────────────────
-- Tables: "user", session, account, verification

-- ── Legacy org table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Engagements ──────────────────────────────────────────────────────────
-- CANONICAL: column is `title`. API returns as `name` via SELECT title AS name.
CREATE TABLE IF NOT EXISTS engagements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  frameworks   JSONB NOT NULL DEFAULT '[]',
  period_start DATE,
  period_end   DATE,
  status       TEXT DEFAULT 'active'
    CHECK (status IN ('planned','active','completed','archived')),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engagement_scope (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id     UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  control_id        TEXT NOT NULL,
  in_scope          BOOLEAN DEFAULT TRUE,
  risk_score        INTEGER CHECK (risk_score BETWEEN 1 AND 5),
  scoping_rationale TEXT,
  scoped_by         TEXT,
  scoped_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(engagement_id, control_id)
);

CREATE TABLE IF NOT EXISTS engagement_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id      UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL,
  role_in_engagement TEXT NOT NULL CHECK (role_in_engagement IN ('preparer','reviewer','lead')),
  assigned_by        TEXT,
  assigned_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(engagement_id, user_id)
);

-- ── Workpapers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workpapers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  control_id            TEXT NOT NULL,
  version               INTEGER DEFAULT 1,
  implementation_status TEXT,
  test_result           TEXT,
  residual_risk         TEXT,
  exceptions_noted      TEXT,
  conclusion            TEXT,
  state                 TEXT DEFAULT 'draft',
  prepared_at           TIMESTAMP,
  prepared_by           TEXT,
  locked                BOOLEAN DEFAULT FALSE,
  signed_off_at         TIMESTAMP,
  reviewed_by           TEXT,
  reviewer_id           TEXT,
  frequency             TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ── Workpaper versions ───────────────────────────────────────────────────
-- CANONICAL: changed_by / changed_at (NOT saved_by / saved_at)
CREATE TABLE IF NOT EXISTS workpaper_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID NOT NULL REFERENCES workpapers(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  changed_by   TEXT NOT NULL,
  changed_at   TIMESTAMP DEFAULT NOW()
);

-- ── Evidence ─────────────────────────────────────────────────────────────
-- CANONICAL: filename / file_type / file_size / url (NOT name / type / file_url)
CREATE TABLE IF NOT EXISTS evidence (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID NOT NULL REFERENCES workpapers(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  url          TEXT,
  description  TEXT,
  ai_score     FLOAT,
  ai_feedback  TEXT,
  verified_by  TEXT,
  uploaded_by  TEXT,
  uploaded_at  TIMESTAMP DEFAULT NOW(),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Findings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS findings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id           UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  workpaper_id            UUID REFERENCES workpapers(id),
  control_id              TEXT,
  title                   TEXT NOT NULL,
  description             TEXT,
  severity                TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status                  TEXT DEFAULT 'open'
    CHECK (status IN ('open','in-progress','remediated','closed','waived')),
  origin                  TEXT DEFAULT 'auditor_authored',
  management_response     TEXT CHECK (management_response IN ('agreed','partial','disagreed')),
  agreed_action           TEXT,
  action_owner            TEXT,
  due_date                DATE,
  target_remediation_date DATE,
  remediated_date         DATE,
  retest_result           TEXT,
  retested_by             TEXT,
  retested_at             TIMESTAMP,
  closed_at               TIMESTAMP,
  repeat_finding          BOOLEAN DEFAULT FALSE,
  prior_year_finding_id   UUID REFERENCES findings(id),
  year_raised             INTEGER,
  raised_by               TEXT,
  raised_date             DATE,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ── Remediation actions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS remediation_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id  UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_date DATE,
  status      TEXT DEFAULT 'open'
    CHECK (status IN ('open','in_progress','complete','verified')),
  evidence_id UUID REFERENCES evidence(id),
  verified_by TEXT,
  verified_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Comments / Review notes ──────────────────────────────────────────────
-- CANONICAL: includes note_type / status / response / responded_by / closed_by
CREATE TABLE IF NOT EXISTS comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
  finding_id   UUID REFERENCES findings(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  author_id    TEXT,
  author       TEXT,
  note_type    TEXT DEFAULT 'review_note'
    CHECK (note_type IN ('review_note','query','action')),
  status       TEXT DEFAULT 'open'
    CHECK (status IN ('open','responded','closed')),
  response     TEXT,
  responded_by TEXT,
  responded_at TIMESTAMP,
  closed_by    TEXT,
  closed_at    TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW(),
  resolved_at  TIMESTAMP
);

-- ── AI analyses ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id     UUID REFERENCES workpapers(id) ON DELETE CASCADE,
  engagement_id    UUID REFERENCES engagements(id),
  control_id       TEXT,
  mode             TEXT NOT NULL CHECK (mode IN ('advisory','assurance')),
  analysis         TEXT,
  model            TEXT,
  disposition      TEXT CHECK (disposition IN ('accepted','modified','rejected')),
  modified_text    TEXT,
  auditor_note     TEXT,
  dispositioned_by TEXT,
  dispositioned_at TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ── Audit log ────────────────────────────────────────────────────────────
-- actor_name MUST be server-derived (never from x-actor-* headers)
-- Writes must NOT use .catch(()=>{}) — surface failures
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES engagements(id),
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  actor_name    TEXT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── PBC items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pbc_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id  UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  control_id     TEXT,
  ref            TEXT NOT NULL,
  description    TEXT NOT NULL,
  document_type  TEXT,
  owner          TEXT,
  due_date       DATE,
  status         TEXT DEFAULT 'outstanding'
    CHECK (status IN ('outstanding','received','partial','waived')),
  chase_count    INTEGER DEFAULT 0,
  last_chased_at TIMESTAMP,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ── RoPA ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ropa_entries (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  department              TEXT,
  purpose                 TEXT NOT NULL,
  lawful_basis            TEXT NOT NULL
    CHECK (lawful_basis IN ('consent','contract','legal_obligation',
                            'vital_interests','public_task','legitimate_interests')),
  data_categories         TEXT[],
  data_subjects           TEXT[],
  recipients              TEXT[],
  third_country_transfers BOOLEAN DEFAULT FALSE,
  transfer_mechanism      TEXT,
  transfer_countries      TEXT[],
  retention_period        TEXT,
  dpia_required           BOOLEAN DEFAULT FALSE,
  dpia_completed          BOOLEAN DEFAULT FALSE,
  status                  TEXT DEFAULT 'active'
    CHECK (status IN ('active','under_review','archived')),
  last_reviewed           TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ── Breach register ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breach_register (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref                    TEXT UNIQUE NOT NULL,
  title                  TEXT NOT NULL,
  discovered_at          TIMESTAMP NOT NULL,
  reported_at            TIMESTAMP,
  description            TEXT,
  breach_type            TEXT[],
  data_subjects_affected INTEGER,
  severity               TEXT CHECK (severity IN ('low','medium','high','critical')),
  notified_sa            BOOLEAN DEFAULT FALSE,
  sa_notified_at         TIMESTAMP,
  notified_individuals   BOOLEAN DEFAULT FALSE,
  status                 TEXT DEFAULT 'open'
    CHECK (status IN ('open','investigating','contained','closed')),
  root_cause             TEXT,
  remediation            TEXT,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

-- ── Processor register ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processor_register (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  service_description TEXT,
  contact_name        TEXT,
  contact_email       TEXT,
  country             TEXT,
  risk_tier           TEXT DEFAULT 'medium'
    CHECK (risk_tier IN ('low','medium','high','critical')),
  dpa_status          TEXT DEFAULT 'pending'
    CHECK (dpa_status IN ('pending','signed','expired','not_required')),
  dpa_signed_date     DATE,
  dpa_expiry_date     DATE,
  sub_processors      TEXT[],
  transfer_mechanism  TEXT,
  transfer_countries  TEXT[],
  last_review_date    DATE,
  next_review_date    DATE,
  status              TEXT DEFAULT 'active'
    CHECK (status IN ('active','under_review','terminated')),
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ── DPIA ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dpia (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  processing_description  TEXT NOT NULL,
  necessity_justification TEXT,
  risks                   JSONB DEFAULT '[]',
  mitigations             TEXT,
  dpo_consulted           BOOLEAN DEFAULT FALSE,
  dpo_advice              TEXT,
  residual_risk           TEXT DEFAULT 'medium'
    CHECK (residual_risk IN ('low','medium','high')),
  screening_answers       JSONB DEFAULT '{}',
  approved_by             TEXT,
  approved_at             TIMESTAMP,
  status                  TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','rejected')),
  created_by              TEXT,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ── Monitoring schedule ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitoring_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id    TEXT NOT NULL,
  engagement_id UUID REFERENCES engagements(id),
  frequency     TEXT NOT NULL DEFAULT 'Annual',
  last_tested   DATE,
  next_due      DATE,
  assigned_to   TEXT,
  status        TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','overdue','in_progress','complete')),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wp_engagement    ON workpapers(engagement_id);
CREATE INDEX IF NOT EXISTS idx_findings_eng     ON findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_findings_wp      ON findings(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_evidence_wp      ON evidence(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_comments_wp      ON comments(workpaper_id);
CREATE INDEX IF NOT EXISTS idx_audit_engagement ON audit_log(engagement_id);
CREATE INDEX IF NOT EXISTS idx_schedule_control ON monitoring_schedule(control_id);
CREATE INDEX IF NOT EXISTS idx_schedule_due     ON monitoring_schedule(next_due);
CREATE INDEX IF NOT EXISTS idx_scope_engagement ON engagement_scope(engagement_id);
