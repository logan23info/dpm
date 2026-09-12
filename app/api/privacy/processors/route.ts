// app/api/privacy/processors/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const result = await sql`
      SELECT * FROM processor_register ORDER BY risk_tier DESC, name ASC
    `
    const rows = result.rows as any[]
    const summary = {
      total:      rows.length,
      high:       rows.filter(r => r.risk_tier === 'high' || r.risk_tier === 'critical').length,
      dpaPending: rows.filter(r => r.dpa_status === 'pending').length,
      dpaExpired: rows.filter(r => r.dpa_status === 'expired').length,
      transfers:  rows.filter(r => r.transfer_countries?.length > 0).length,
    }
    return NextResponse.json({ processors: rows, summary })
  } catch (error) {
    console.error('GET processors error:', error)
    return NextResponse.json({ error: 'Failed to fetch processors' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, service_description, contact_name, contact_email,
      country, risk_tier, dpa_status, dpa_signed_date, dpa_expiry_date,
      sub_processors, transfer_mechanism, transfer_countries, notes,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO processor_register (
        name, service_description, contact_name, contact_email,
        country, risk_tier, dpa_status, dpa_signed_date, dpa_expiry_date,
        sub_processors, transfer_mechanism, transfer_countries,
        next_review_date, notes
      ) VALUES (
        ${name}, ${service_description || null}, ${contact_name || null},
        ${contact_email || null}, ${country || null},
        ${risk_tier || 'medium'}, ${dpa_status || 'pending'},
        ${dpa_signed_date || null}, ${dpa_expiry_date || null},
        ${JSON.stringify(sub_processors || [])},
        ${transfer_mechanism || null},
        ${JSON.stringify(transfer_countries || [])},
        ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]},
        ${notes || null}
      )
      RETURNING *
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST processor error:', error)
    return NextResponse.json({ error: 'Failed to create processor' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const result = await sql`
      UPDATE processor_register SET
        dpa_status       = COALESCE(${fields.dpa_status || null},       dpa_status),
        dpa_signed_date  = COALESCE(${fields.dpa_signed_date || null},  dpa_signed_date),
        dpa_expiry_date  = COALESCE(${fields.dpa_expiry_date || null},  dpa_expiry_date),
        risk_tier        = COALESCE(${fields.risk_tier || null},         risk_tier),
        status           = COALESCE(${fields.status || null},            status),
        last_review_date = NOW(),
        next_review_date = COALESCE(${fields.next_review_date || null},  next_review_date),
        notes            = COALESCE(${fields.notes || null},             notes),
        updated_at       = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update processor' }, { status: 500 })
  }
}
