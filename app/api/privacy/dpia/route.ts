// app/api/privacy/dpia/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM dpia ORDER BY created_at DESC
    `
    const rows = result.rows as any[]
    const summary = {
      total:    rows.length,
      draft:    rows.filter(r => r.status === 'draft').length,
      approved: rows.filter(r => r.status === 'approved').length,
      highRisk: rows.filter(r => r.residual_risk === 'high').length,
    }
    return NextResponse.json({ dpias: rows, summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const {
      name, processing_description, necessity_justification,
      risks, mitigations, dpo_consulted, dpo_advice,
      residual_risk, screening_answers,
    } = body

    if (!name || !processing_description) {
      return NextResponse.json({ error: 'name and processing_description required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO dpia (
        name, processing_description, necessity_justification,
        risks, mitigations, dpo_consulted, dpo_advice,
        residual_risk, screening_answers, created_by
      ) VALUES (
        ${name},
        ${processing_description},
        ${necessity_justification || null},
        ${JSON.stringify(risks || [])},
        ${mitigations || null},
        ${dpo_consulted || false},
        ${dpo_advice || null},
        ${residual_risk || 'medium'},
        ${JSON.stringify(screening_answers || {})},
        ${user?.name || 'Unknown'}
      ) RETURNING *
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, action, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (action === 'approve') {
      const result = await sql`
        UPDATE dpia SET
          status = 'approved', approved_by = ${user?.name || 'Unknown'},
          approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'submit') {
      const result = await sql`
        UPDATE dpia SET status = 'review', updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    const result = await sql`
      UPDATE dpia SET
        name                     = COALESCE(${fields.name || null}, name),
        processing_description   = COALESCE(${fields.processing_description || null}, processing_description),
        necessity_justification  = COALESCE(${fields.necessity_justification || null}, necessity_justification),
        risks                    = COALESCE(${fields.risks ? JSON.stringify(fields.risks) : null}, risks),
        mitigations              = COALESCE(${fields.mitigations || null}, mitigations),
        dpo_consulted            = COALESCE(${fields.dpo_consulted ?? null}, dpo_consulted),
        dpo_advice               = COALESCE(${fields.dpo_advice || null}, dpo_advice),
        residual_risk            = COALESCE(${fields.residual_risk || null}, residual_risk),
        updated_at               = NOW()
      WHERE id = ${id} RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}