// app/api/engagements/[id]/bulk-workpapers/route.ts
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import controls from '@/lib/controls'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { frameworks, keyControlsOnly } = body

    if (!frameworks || !Array.isArray(frameworks) || frameworks.length === 0) {
      return NextResponse.json({ error: 'Select at least one framework' }, { status: 400 })
    }

    // Get controls for selected frameworks
    let toCreate = frameworks.flatMap((fw: string) => controls.byFramework(fw))
    if (keyControlsOnly) toCreate = toCreate.filter(c => c.key_control)

    if (toCreate.length === 0) {
      return NextResponse.json({ error: 'No controls found for selected frameworks' }, { status: 400 })
    }

    // Get existing workpapers to avoid duplicates
    const existing = await sql`SELECT control_id FROM workpapers WHERE engagement_id = ${params.id}`
    const existingIds = new Set((existing.rows as any[]).map(r => r.control_id))

    const toInsert = toCreate.filter(c => !existingIds.has(c.id))

    if (toInsert.length === 0) {
      return NextResponse.json({ message: 'All controls already have workpapers', created: 0 })
    }

    // Insert all at once
    let created = 0
    for (const ctrl of toInsert) {
      await sql`
        INSERT INTO workpapers (engagement_id, control_id, version)
        VALUES (${params.id}, ${ctrl.id}, 1)
        ON CONFLICT DO NOTHING
      `
      created++
    }

    return NextResponse.json({ message: `Created ${created} workpapers`, created })
  } catch (e: any) {
    console.error('Bulk workpapers error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
