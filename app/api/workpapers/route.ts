import { auth } from "@/lib/auth"
import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/workpapers
 * Create a workpaper for a control in an engagement
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { engagement_id, control_id } = body

    if (!engagement_id || !control_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user has access to this engagement
    const engResult = await sql`
      SELECT id, org_id FROM engagements WHERE id = ${engagement_id}
    `
    if (engResult.rows.length === 0) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO workpapers (engagement_id, control_id, prepared_by)
      VALUES (${engagement_id}, ${control_id}, ${session.user.id})
      RETURNING id, engagement_id, control_id, version, created_at
    `

    const wp = result.rows[0]

    // Create version 1 snapshot
    await sql`
      INSERT INTO workpaper_versions (workpaper_id, version, snapshot, changed_by)
      VALUES (${wp.id}, 1, ${JSON.stringify(wp)}, ${session.user.id})
    `

    // Audit log
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_id, new_value)
      VALUES (${engagement_id}, 'workpaper', ${wp.id}, 'created', ${session.user.id}, ${JSON.stringify(wp)})
    `

    return NextResponse.json(wp, { status: 201 })
  } catch (error) {
    console.error("POST /api/workpapers:", error)
    return NextResponse.json(
      { error: "Failed to create workpaper" },
      { status: 500 }
    )
  }
}
