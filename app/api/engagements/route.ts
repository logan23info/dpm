// app/api/engagements/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await sql`
      SELECT id, title as name, frameworks, period_start, period_end, status, created_at
      FROM engagements ORDER BY created_at DESC
    `
    return NextResponse.json(result.rows, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, frameworks, period_start, period_end } = await req.json()
    if (!name || !frameworks || !Array.isArray(frameworks)) {
      return NextResponse.json({ error: 'name and frameworks required' }, { status: 400 })
    }
    const result = await sql`
      INSERT INTO engagements (title, frameworks, period_start, period_end, status)
      VALUES (${name}, ${JSON.stringify(frameworks)}, ${period_start||null}, ${period_end||null}, 'active')
      RETURNING id, title as name, frameworks, period_start, period_end, status, created_at
    `
    return NextResponse.json(result.rows[0], { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
