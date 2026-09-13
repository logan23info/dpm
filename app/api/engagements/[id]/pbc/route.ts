// app/api/engagements/[id]/pbc/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
import controls from '@/lib/controls'

export const dynamic = 'force-dynamic'

// GET PBC items for engagement
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT id, control_id, ref, description, document_type,
             owner, due_date, status, received_at, chase_count,
             last_chased_at, notes, created_at, updated_at
      FROM pbc_items
      WHERE engagement_id = ${params.id}
      ORDER BY
        CASE status
          WHEN 'outstanding' THEN 1
          WHEN 'partial'     THEN 2
          WHEN 'received'    THEN 3
          WHEN 'waived'      THEN 4
        END,
        due_date ASC NULLS LAST
    `

    const rows = result.rows as any[]
    const summary = {
      total:       rows.length,
      outstanding: rows.filter(r => r.status === 'outstanding').length,
      partial:     rows.filter(r => r.status === 'partial').length,
      received:    rows.filter(r => r.status === 'received').length,
      overdue:     rows.filter(r =>
        r.status === 'outstanding' && r.due_date && new Date(r.due_date) < new Date()
      ).length,
    }

    return NextResponse.json({ items: rows, summary })
  } catch (error) {
    console.error('GET PBC error:', error)
    return NextResponse.json({ error: 'Failed to fetch PBC' }, { status: 500 })
  }
}

// POST — create PBC items (manual or auto-generate from scope)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()

    // Auto-generate from in-scope controls
    if (body.autoGenerate) {
      const scopeResult = await sql`
        SELECT control_id FROM engagement_scope
        WHERE engagement_id = ${params.id} AND in_scope = TRUE
      `

      if (scopeResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No in-scope controls found. Complete scoping first.' },
          { status: 400 }
        )
      }

      const created = []
      let refNum = 1

      for (const row of scopeResult.rows) {
        const control = controls.get(row.control_id)
        if (!control?.evidence_required) continue

        // Each control's evidence_required becomes one PBC item
        const ref = `PBC-${String(refNum).padStart(3, '0')}`
        const result = await sql`
          INSERT INTO pbc_items (
            engagement_id, control_id, ref, description,
            document_type, status, created_at, updated_at
          ) VALUES (
            ${params.id}, ${row.control_id}, ${ref},
            ${control.evidence_required},
            'document', 'outstanding', NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
          RETURNING id, ref, description
        `
        if (result.rows.length > 0) {
          created.push(result.rows[0])
          refNum++
        }
      }

      return NextResponse.json({
        created: created.length,
        message: `Generated ${created.length} PBC items from in-scope controls`,
      }, { status: 201 })
    }

    // Manual single item
    const { ref, description, document_type, owner, due_date, control_id } = body
    if (!description) {
      return NextResponse.json({ error: 'description required' }, { status: 400 })
    }

    // Auto-ref if not provided
    const autoRef = ref || `PBC-${Date.now().toString().slice(-4)}`

    const result = await sql`
      INSERT INTO pbc_items (
        engagement_id, control_id, ref, description,
        document_type, owner, due_date, status, created_at, updated_at
      ) VALUES (
        ${params.id}, ${control_id || null}, ${autoRef}, ${description},
        ${document_type || null}, ${owner || null}, ${due_date || null},
        'outstanding', NOW(), NOW()
      )
      RETURNING *
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST PBC error:', error)
    return NextResponse.json({ error: 'Failed to create PBC item' }, { status: 500 })
  }
}

// PATCH — update status, chase, receive
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { id, action, ...fields } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 })
    }

    if (action === 'receive') {
      const result = await sql`
        UPDATE pbc_items SET
          status = 'received', received_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'chase') {
      const result = await sql`
        UPDATE pbc_items SET
          chase_count = chase_count + 1, last_chased_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'update') {
      const result = await sql`
        UPDATE pbc_items SET
          status      = COALESCE(${fields.status || null},      status),
          owner       = COALESCE(${fields.owner || null},       owner),
          due_date    = COALESCE(${fields.due_date || null},    due_date),
          notes       = COALESCE(${fields.notes || null},       notes),
          updated_at  = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH PBC error:', error)
    return NextResponse.json({ error: 'Failed to update PBC item' }, { status: 500 })
  }
}