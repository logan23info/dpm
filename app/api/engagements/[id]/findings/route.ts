// app/api/engagements/[id]/findings/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Query directly on engagement_id — no workpaper JOIN needed
    const result = await sql`
      SELECT
        id, control_id, title, severity, status, description,
        due_date, raised_date, target_remediation_date, origin,
        created_at, updated_at
      FROM findings
      WHERE engagement_id = ${params.id}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          WHEN 'low'      THEN 4
          ELSE 5
        END,
        created_at DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/engagements/:id/findings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const {
      title,
      severity,
      description,
      due_date,
      workpaper_id,
      control_id,
      origin,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO findings (
        engagement_id,
        workpaper_id,
        control_id,
        title,
        severity,
        description,
        due_date,
        status,
        origin
      ) VALUES (
        ${params.id},
        ${workpaper_id || null},
        ${control_id || null},
        ${title},
        ${severity || 'medium'},
        ${description || null},
        ${due_date || null},
        'open',
        ${origin || 'auditor_authored'}
      )
      RETURNING id, control_id, title, severity, status, description,
                due_date, raised_date, origin, created_at
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/engagements/:id/findings:', error)
    return NextResponse.json(
      { error: 'Failed to create finding' },
      { status: 500 }
    )
  }
}