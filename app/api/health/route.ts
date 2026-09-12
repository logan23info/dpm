// app/api/health/route.ts
// Health check endpoint for monitoring and deployment verification
// Returns 200 if healthy, 503 if degraded

import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {}
  let overallOk = true

  // Check 1: Required env vars
  const requiredEnvVars = ['DATABASE_URL', 'POSTGRES_URL', 'DPM_Key']
  const missingEnv = requiredEnvVars.filter(v => !process.env[v])

  checks.env = {
    ok: missingEnv.length === 0,
    message: missingEnv.length > 0
      ? `Missing: ${missingEnv.join(', ')}`
      : 'All required env vars present',
  }
  if (!checks.env.ok) overallOk = false

  // Check 2: Database connectivity
  try {
    const result = await sql`SELECT 1 as ping`
    checks.database = {
      ok: result.rows.length > 0,
      message: 'Connected to Neon DB',
    }
  } catch (error: any) {
    checks.database = {
      ok: false,
      message: `DB connection failed: ${error.message}`,
    }
    overallOk = false
  }

  // Check 3: Required tables exist
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    const tableNames = (tables.rows as any[]).map(r => r.table_name)
    const required = ['engagements', 'workpapers', 'findings', 'evidence', 'ai_analyses']
    const missing = required.filter(t => !tableNames.includes(t))

    checks.tables = {
      ok: missing.length === 0,
      message: missing.length > 0
        ? `Missing tables: ${missing.join(', ')}`
        : `${tableNames.length} tables present`,
    }
    if (!checks.tables.ok) overallOk = false
  } catch (error: any) {
    checks.tables = { ok: false, message: error.message }
    overallOk = false
  }

  // Check 4: Groq API key format (don't actually call the API)
  const groqKey = process.env.DPM_Key || ''
  checks.ai = {
    ok: groqKey.startsWith('gsk_') && groqKey.length > 20,
    message: groqKey.startsWith('gsk_')
      ? 'DPM_Key (Groq) configured'
      : 'DPM_Key missing or invalid format',
  }
  if (!checks.ai.ok) overallOk = false

  const status = overallOk ? 200 : 503

  return NextResponse.json(
    {
      status: overallOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    },
    { status }
  )
}
