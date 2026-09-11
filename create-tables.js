const { Client } = require('pg')
require('dotenv').config()

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('✅ Connected')

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS engagements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        org_id UUID REFERENCES organizations(id),
        status VARCHAR(50) DEFAULT 'active',
        framework VARCHAR(100),
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workpapers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID REFERENCES engagements(id),
        control_id VARCHAR(100),
        title VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        implementation_status VARCHAR(50),
        test_result VARCHAR(50),
        residual_risk VARCHAR(50),
        prepared_by UUID,
        reviewed_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workpaper_id UUID REFERENCES workpapers(id),
        filename VARCHAR(255),
        url TEXT,
        uploaded_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS findings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workpaper_id UUID REFERENCES workpapers(id),
        title VARCHAR(255),
        severity VARCHAR(50),
        status VARCHAR(50) DEFAULT 'open',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)

    console.log('✅ All tables created successfully')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

createTables()
