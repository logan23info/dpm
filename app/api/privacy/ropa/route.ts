// app/api/privacy/ropa/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const result = await sql`
      SELECT * FROM ropa_entries
      ORDER BY status ASC, name ASC
    `
    const summary = {
      total:         result.rows.length,
      active:        result.rows.filter(r => r.status === 'active').length,
      dpiaRequired:  result.rows.filter(r => r.dpia_required).length,
      dpiaCompleted: result.rows.filter(r => r.dpia_completed).length,
      transfers:     result.rows.filter(r => r.third_country_transfers).length,
    }
    return NextResponse.json({ entries: result.rows, summary })
  } catch (error) {
    console.error('GET RoPA error:', error)
    return NextResponse.json({ error: 'Failed to fetch RoPA' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, department, purpose, lawful_basis, data_categories,
      data_subjects, recipients, third_country_transfers, transfer_mechanism,
      retention_period, retention_basis, security_measures,
      dpia_required, controller,
    } = body

    if (!name || !purpose || !lawful_basis) {
      return NextResponse.json(
        { error: 'name, purpose, and lawful_basis are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO ropa_entries (
        name, department, purpose, lawful_basis,
        data_categories, data_subjects, recipients,
        third_country_transfers, transfer_mechanism,
        retention_period, retention_basis, security_measures,
        dpia_required, controller, last_reviewed
      ) VALUES (
        ${name}, ${department || null}, ${purpose}, ${lawful_basis},
        ${JSON.stringify(data_categories || [])},
        ${JSON.stringify(data_subjects || [])},
        ${JSON.stringify(recipients || [])},
        ${third_country_transfers || false}, ${transfer_mechanism || null},
        ${retention_period || null}, ${retention_basis || null},
        ${security_measures || null},
        ${dpia_required || false}, ${controller || null},
        NOW()
      )
      RETURNING *
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST RoPA error:', error)
    return NextResponse.json({ error: 'Failed to create RoPA entry' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const result = await sql`
      UPDATE ropa_entries SET
        name                    = COALESCE(${fields.name || null}, name),
        purpose                 = COALESCE(${fields.purpose || null}, purpose),
        lawful_basis            = COALESCE(${fields.lawful_basis || null}, lawful_basis),
        retention_period        = COALESCE(${fields.retention_period || null}, retention_period),
        dpia_required           = COALESCE(${fields.dpia_required ?? null}, dpia_required),
        dpia_completed          = COALESCE(${fields.dpia_completed ?? null}, dpia_completed),
        third_country_transfers = COALESCE(${fields.third_country_transfers ?? null}, third_country_transfers),
        status                  = COALESCE(${fields.status || null}, status),
        last_reviewed           = NOW(),
        updated_at              = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update RoPA entry' }, { status: 500 })
  }
}
