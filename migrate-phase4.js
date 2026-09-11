const { Client } = require('pg')
require('dotenv').config()

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('✅ Connected')

    await client.query(`
      ALTER TABLE evidence
        ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS file_size INTEGER,
        ADD COLUMN IF NOT EXISTS description TEXT;

      ALTER TABLE workpapers
        ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);

      CREATE INDEX IF NOT EXISTS idx_evidence_workpaper ON evidence(workpaper_id);
      CREATE INDEX IF NOT EXISTS idx_findings_workpaper ON findings(workpaper_id);
    `)

    console.log('✅ Phase 4 migrations complete')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

migrate()
