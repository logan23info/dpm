// sprint0-migrate.js
// Aligns the deployed Neon DB to the designed schema in lib/db.ts
// Run once: node sprint0-migrate.js
// Safe to re-run — all operations use IF NOT EXISTS / DO NOTHING

const { Client } = require('pg')
require('dotenv').config()

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('✅ Connected to Neon DB')

    // ── Step 1: findings — add engagement_id (the critical fix) ──────
    await client.query(`
      ALTER TABLE findings
        ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES engagements(id),
        ADD COLUMN IF NOT EXISTS control_id TEXT,
        ADD COLUMN IF NOT EXISTS raised_date DATE DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS target_remediation_date DATE,
        ADD COLUMN IF NOT EXISTS remediated_date DATE,
        ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'auditor_authored';
    `)
    console.log('✅ findings — columns added')

    // Backfill engagement_id from workpaper join (for existing findings)
    await client.query(`
      UPDATE findings f
        SET engagement_id = w.engagement_id
        FROM workpapers w
        WHERE f.workpaper_id = w.id
          AND f.engagement_id IS NULL;
    `)
    console.log('✅ findings — engagement_id backfilled')

    // ── Step 2: workpapers — align status fields ──────────────────────
    await client.query(`
      ALTER TABLE workpapers
        ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'draft',
        ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
    `)
    console.log('✅ workpapers — columns added')

    // ── Step 3: remediation_actions ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS remediation_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        target_date DATE,
        status TEXT DEFAULT 'open'
          CHECK (status IN ('open', 'in_progress', 'complete', 'verified')),
        verified_by TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ remediation_actions — created')

    // ── Step 4: ai_analyses (persist every AI output + disposition) ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
        engagement_id UUID REFERENCES engagements(id),
        control_id TEXT,
        mode TEXT NOT NULL CHECK (mode IN ('advisory', 'assurance')),
        analysis TEXT NOT NULL,
        model TEXT,
        disposition TEXT CHECK (disposition IN ('accepted', 'modified', 'rejected')),
        modified_text TEXT,
        auditor_note TEXT,
        dispositioned_by TEXT,
        dispositioned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ ai_analyses — created')

    // ── Step 5: evidence — add sufficiency scoring fields ─────────────
    await client.query(`
      ALTER TABLE evidence
        ADD COLUMN IF NOT EXISTS file_type TEXT,
        ADD COLUMN IF NOT EXISTS file_size INTEGER,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS ai_score FLOAT CHECK (ai_score >= 0 AND ai_score <= 1),
        ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
        ADD COLUMN IF NOT EXISTS verified_by TEXT,
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    `)
    console.log('✅ evidence — columns added')

    // ── Step 6: comments — align to lib/db.ts design ─────────────────
    await client.query(`
      ALTER TABLE comments
        ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'review_note',
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'
          CHECK (status IN ('open', 'responded', 'closed')),
        ADD COLUMN IF NOT EXISTS response TEXT,
        ADD COLUMN IF NOT EXISTS responded_by TEXT,
        ADD COLUMN IF NOT EXISTS closed_by TEXT,
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS finding_id UUID REFERENCES findings(id);
    `)
    console.log('✅ comments — columns added')

    // ── Step 7: audit_log — add actor_name for pre-auth sessions ─────
    await client.query(`
      ALTER TABLE audit_log
        ADD COLUMN IF NOT EXISTS actor_name TEXT;
    `)
    console.log('✅ audit_log — actor_name added')

    // ── Step 8: indexes ────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_findings_engagement ON findings(engagement_id);
      CREATE INDEX IF NOT EXISTS idx_findings_control ON findings(control_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analyses_workpaper ON ai_analyses(workpaper_id);
      CREATE INDEX IF NOT EXISTS idx_remediation_finding ON remediation_actions(finding_id);
      CREATE INDEX IF NOT EXISTS idx_comments_finding ON comments(finding_id);
    `)
    console.log('✅ indexes — created')

    // ── Verify ─────────────────────────────────────────────────────────
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log('\n📋 Tables in DB:')
    tables.rows.forEach(r => console.log(`   ${r.table_name}`))

    const findingsCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'findings' ORDER BY ordinal_position
    `)
    console.log('\n📋 findings columns:')
    findingsCols.rows.forEach(r => console.log(`   ${r.column_name}`))

    console.log('\n✅ Sprint 0 migration complete')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

migrate()
