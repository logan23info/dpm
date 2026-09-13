// app/api/engagements/[id]/bulk-workpapers/route.ts
// Handles both formats:
//   modal sends: { framework: "GDPR", keyOnly: true }
//   new format:  { frameworks: ["GDPR"], keyControlsOnly: true }

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import controls from '@/lib/controls'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    // Support both formats
    const frameworkList: string[] = body.frameworks
      ? (Array.isArray(body.frameworks) ? body.frameworks : [body.frameworks])
      : body.framework
      ? [body.framework]
      : []

    const keyOnly: boolean = body.keyOnly ?? body.keyControlsOnly ?? false

    if (frameworkList.length === 0) {
      return NextResponse.json({ error: 'Select at least one framework' }, { status: 400 })
    }

    // Get controls for selected frameworks
    let toCreate = frameworkList.flatMap((fw: string) =>
      keyOnly ? controls.keyControls(fw) : controls.byFramework(fw)
    )

    if (toCreate.length === 0) {
      return NextResponse.json({ error: 'No controls found for selected frameworks' }, { status: 400 })
    }

    // Get existing workpapers to avoid duplicates
    const existing = await sql`SELECT control_id FROM workpapers WHERE engagement_id = ${params.id}`
    const existingIds = new Set(Array.from((existing.rows as any[]).map(r => r.control_id)))
    const toInsert = toCreate.filter(c => !existingIds.has(c.id))

    let created = 0
    let skipped = toCreate.length - toInsert.length
    let errors = 0

    for (const ctrl of toInsert) {
      try {
        await sql`
          INSERT INTO workpapers (engagement_id, control_id, version)
          VALUES (${params.id}, ${ctrl.id}, 1)
          ON CONFLICT DO NOTHING
        `
        created++
      } catch (e) { errors++ }
    }

    return NextResponse.json({ message: `Created ${created} workpapers`, created, skipped, errors, total: toCreate.length })
  } catch (e: any) {
    console.error('Bulk workpapers error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
