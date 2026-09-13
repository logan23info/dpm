// app/api/workpapers/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    const body = await req.json()
    const { engagement_id, control_id, implementation_status, test_result, residual_risk, conclusion, exceptions_noted } = body

    if (!engagement_id || !control_id) {
      return NextResponse.json({ error: 'engagement_id and control_id required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO workpapers (
        engagement_id, control_id, version,
        implementation_status, test_result, residual_risk,
        conclusion, exceptions_noted, prepared_by, state
      ) VALUES (
        ${engagement_id}, ${control_id}, 1,
        ${implementation_status || null}, ${test_result || null}, ${residual_risk || null},
        ${conclusion || null}, ${exceptions_noted || null},
        ${sessionUser?.id || null}, 'draft'
      )
      RETURNING id, engagement_id, control_id, version, implementation_status,
                test_result, residual_risk, conclusion, signed_off_at, created_at
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e: any) {
    console.error('POST /api/workpapers:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
