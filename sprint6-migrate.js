// sprint6-migrate.js
const { Client } = require('pg')
require('dotenv').config()

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('✅ Connected')

    // Processor/vendor register (GDPR Art. 28, DPDP Sec 8.2)
    await client.query(`
      CREATE TABLE IF NOT EXISTS processor_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        service_description TEXT,
        contact_name TEXT,
        contact_email TEXT,
        country TEXT,
        risk_tier TEXT DEFAULT 'medium'
          CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
        dpa_status TEXT DEFAULT 'pending'
          CHECK (dpa_status IN ('pending', 'signed', 'expired', 'not_required')),
        dpa_signed_date DATE,
        dpa_expiry_date DATE,
        sub_processors TEXT[],
        transfer_mechanism TEXT,
        transfer_countries TEXT[],
        last_review_date DATE,
        next_review_date DATE,
        status TEXT DEFAULT 'active'
          CHECK (status IN ('active', 'under_review', 'terminated')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ processor_register table')

    // Ensure findings has all needed columns for lifecycle
    await client.query(`
      ALTER TABLE findings
        ADD COLUMN IF NOT EXISTS management_response TEXT
          CHECK (management_response IN ('agreed','partial','disagreed')),
        ADD COLUMN IF NOT EXISTS agreed_action TEXT,
        ADD COLUMN IF NOT EXISTS action_owner TEXT,
        ADD COLUMN IF NOT EXISTS target_remediation_date DATE,
        ADD COLUMN IF NOT EXISTS remediated_date DATE,
        ADD COLUMN IF NOT EXISTS retest_result TEXT,
        ADD COLUMN IF NOT EXISTS retested_by TEXT,
        ADD COLUMN IF NOT EXISTS retested_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `)
    console.log('✅ findings columns for lifecycle')

    console.log('\n✅ Sprint 6 migration complete')
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

migrate()
