const { Client } = require('pg')
require('dotenv').config()

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('✅ Connected')

    await client.query(`
      CREATE TABLE IF NOT EXISTS workpaper_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        snapshot JSONB,
        changed_by VARCHAR(255),
        changed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workpaper_id UUID REFERENCES workpapers(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        author VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID,
        entity_type VARCHAR(100),
        entity_id UUID,
        action VARCHAR(100),
        actor_id VARCHAR(255),
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE engagements
        ADD COLUMN IF NOT EXISTS frameworks JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS period_start DATE,
        ADD COLUMN IF NOT EXISTS period_end DATE,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

      ALTER TABLE workpapers
        ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS implementation_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS test_result VARCHAR(50),
        ADD COLUMN IF NOT EXISTS residual_risk VARCHAR(50),
        ADD COLUMN IF NOT EXISTS exceptions_noted TEXT,
        ADD COLUMN IF NOT EXISTS conclusion TEXT,
        ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      ALTER TABLE findings
        ADD COLUMN IF NOT EXISTS workpaper_id UUID REFERENCES workpapers(id),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open',
        ADD COLUMN IF NOT EXISTS remediation TEXT,
        ADD COLUMN IF NOT EXISTS due_date DATE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `)

    console.log('✅ All Phase 2 tables migrated successfully')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
  } finally {
    await client.end()
  }
}

migrate()
