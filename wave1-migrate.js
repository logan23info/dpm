// wave1-migrate.js
// Aligns Neon DB to canonical schema.sql
// Fixes column mismatches found in QA report (P0-03, P0-04, P0-05)

const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  console.log('✅ Connected')

  // P0-05: workpaper_versions — add changed_by/changed_at if missing
  // (schema had changed_by but API was writing saved_by — align both)
  await client.query(`
    ALTER TABLE workpaper_versions
      ADD COLUMN IF NOT EXISTS changed_by TEXT,
      ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP DEFAULT NOW();
  `)
  console.log('✅ P0-05: workpaper_versions — changed_by/changed_at ensured')

  // P0-03: evidence — ensure filename/file_type/file_size/url columns exist
  await client.query(`
    ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS filename    TEXT,
      ADD COLUMN IF NOT EXISTS file_type   TEXT,
      ADD COLUMN IF NOT EXISTS file_size   INTEGER,
      ADD COLUMN IF NOT EXISTS url         TEXT,
      ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS verified_by TEXT;
  `)
  console.log('✅ P0-03: evidence columns aligned')

  // P0-04: comments — ensure all API columns exist
  await client.query(`
    ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS author       TEXT,
      ADD COLUMN IF NOT EXISTS note_type    TEXT DEFAULT 'review_note',
      ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS response     TEXT,
      ADD COLUMN IF NOT EXISTS responded_by TEXT,
      ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS closed_by    TEXT,
      ADD COLUMN IF NOT EXISTS closed_at    TIMESTAMP;
  `)
  console.log('✅ P0-04: comments columns aligned')

  // P0-01: engagements — ensure updated_at exists
  await client.query(`
    ALTER TABLE engagements
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `)
  console.log('✅ P0-01: engagements — updated_at ensured')

  // P0-06: workpapers — reviewer_id already added in sprint11, ensure it exists
  await client.query(`
    ALTER TABLE workpapers
      ADD COLUMN IF NOT EXISTS reviewer_id TEXT,
      ADD COLUMN IF NOT EXISTS prepared_by TEXT,
      ADD COLUMN IF NOT EXISTS frequency   TEXT,
      ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT NOW();
  `)
  console.log('✅ P0-06: workpapers — reviewer_id and other columns ensured')

  // Audit log — ensure actor_name is not null-constrained where rows exist
  await client.query(`
    ALTER TABLE audit_log
      ALTER COLUMN actor_name SET DEFAULT 'Unknown';
    UPDATE audit_log SET actor_name = 'Unknown' WHERE actor_name IS NULL;
  `)
  console.log('✅ P0-10: audit_log — actor_name defaulted')

  // AI analyses — ensure engagement_id exists
  await client.query(`
    ALTER TABLE ai_analyses
      ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES engagements(id);
  `)
  console.log('✅ ai_analyses — engagement_id ensured')

  console.log('\n✅ Wave 1 migration complete — schema aligned to canonical')
  await client.end()
}

migrate().catch(e => { console.error('❌', e.message); process.exit(1) })
