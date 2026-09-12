// sprint5-migrate.js
// Adds tables for: risk scoping, PBC list, RoPA, breach register
// Run once: node sprint5-migrate.js

const { Client } = require('pg')
require('dotenv').config()

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('✅ Connected')

    // ── Scoping decisions per engagement ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS engagement_scope (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
        control_id TEXT NOT NULL,
        in_scope BOOLEAN DEFAULT TRUE,
        risk_score INTEGER CHECK (risk_score BETWEEN 1 AND 25),
        scoping_rationale TEXT,
        scoped_by TEXT,
        scoped_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(engagement_id, control_id)
      );
      CREATE INDEX IF NOT EXISTS idx_scope_engagement ON engagement_scope(engagement_id);
    `)
    console.log('✅ engagement_scope table')

    // ── PBC / Evidence request list ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS pbc_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
        control_id TEXT,
        ref TEXT NOT NULL,
        description TEXT NOT NULL,
        document_type TEXT,
        owner TEXT,
        due_date DATE,
        status TEXT DEFAULT 'outstanding'
          CHECK (status IN ('outstanding', 'received', 'partial', 'waived')),
        received_at TIMESTAMP,
        chase_count INTEGER DEFAULT 0,
        last_chased_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pbc_engagement ON pbc_items(engagement_id);
    `)
    console.log('✅ pbc_items table')

    // ── RoPA — Record of Processing Activities (GDPR Art. 30) ────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ropa_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        department TEXT,
        purpose TEXT NOT NULL,
        lawful_basis TEXT NOT NULL
          CHECK (lawful_basis IN ('consent','contract','legal_obligation',
                                  'vital_interests','public_task','legitimate_interests')),
        data_categories TEXT[],
        data_subjects TEXT[],
        recipients TEXT[],
        third_country_transfers BOOLEAN DEFAULT FALSE,
        transfer_mechanism TEXT,
        retention_period TEXT,
        retention_basis TEXT,
        security_measures TEXT,
        dpia_required BOOLEAN DEFAULT FALSE,
        dpia_completed BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','under_review','archived')),
        controller TEXT,
        dpo_consulted BOOLEAN DEFAULT FALSE,
        last_reviewed DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ ropa_entries table')

    // ── Breach Register (GDPR Art. 33/34, DPDP Sec 8.6) ─────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS breach_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ref TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        discovered_at TIMESTAMP NOT NULL,
        reported_at TIMESTAMP,
        description TEXT,
        breach_type TEXT[],
        data_categories_affected TEXT[],
        estimated_individuals INTEGER,
        severity TEXT DEFAULT 'medium'
          CHECK (severity IN ('low','medium','high','critical')),
        likely_harm TEXT,
        containment_measures TEXT,
        sa_notification_required BOOLEAN DEFAULT FALSE,
        sa_notified_at TIMESTAMP,
        sa_reference TEXT,
        individual_notification_required BOOLEAN DEFAULT FALSE,
        individuals_notified_at TIMESTAMP,
        status TEXT DEFAULT 'open'
          CHECK (status IN ('open','contained','notified','closed')),
        root_cause TEXT,
        remediation TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ breach_register table')

    console.log('\n✅ Sprint 5 migration complete')

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

migrate()
