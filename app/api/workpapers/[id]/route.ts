import { auth } from "@/lib/auth"
import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/workpapers/:id
 * Retrieve a workpaper with full detail
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const wp = await sql`
      SELECT * FROM workpapers WHERE id = ${params.id}
    `
    if (wp.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Get version history
    const versions = await sql`
      SELECT id, version, changed_by, changed_at FROM workpaper_versions
      WHERE workpaper_id = ${params.id}
      ORDER BY version DESC
    `

    return NextResponse.json({
      ...wp.rows[0],
      versions: versions.rows,
    })
  } catch (error) {
    console.error("GET /api/workpapers/:id:", error)
    return NextResponse.json(
      { error: "Failed to fetch workpaper" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/workpapers/:id
 * Update a workpaper (creates a new version automatically)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Get current workpaper
    const wpResult = await sql`
      SELECT * FROM workpapers WHERE id = ${params.id}
    `
    if (wpResult.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const wp = wpResult.rows[0]
    const oldSnapshot = { ...wp }

    // Update workpaper
    const updateFields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(body)) {
      if (
        [
          "implementation_status",
          "test_result",
          "residual_risk",
          "exceptions_noted",
          "conclusion",
        ].includes(key)
      ) {
        updateFields.push(`${key} = $${values.length + 1}`)
        values.push(value)
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Increment version
    const nextVersion = (wp.version || 1) + 1
    updateFields.push(`version = $${values.length + 1}`)
    values.push(nextVersion)
    updateFields.push(`updated_at = $${values.length + 1}`)
    values.push(new Date())

    const query = `
      UPDATE workpapers
      SET ${updateFields.join(", ")}
      WHERE id = $${values.length + 1}
      RETURNING *
    `
    values.push(params.id)

    const result = await sql.query(query, values)
    const newWp = result.rows[0]

    // Create version snapshot
    await sql`
      INSERT INTO workpaper_versions (workpaper_id, version, snapshot, changed_by)
      VALUES (${params.id}, ${nextVersion}, ${JSON.stringify(newWp)}, ${session.user.id})
    `

    // Audit log
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_id, old_value, new_value)
      VALUES (${wp.engagement_id}, 'workpaper', ${params.id}, 'updated', ${session.user.id}, ${JSON.stringify(oldSnapshot)}, ${JSON.stringify(newWp)})
    `

    return NextResponse.json(newWp)
  } catch (error) {
    console.error("PATCH /api/workpapers/:id:", error)
    return NextResponse.json(
      { error: "Failed to update workpaper" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workpapers/:id/sign-off
 * Lock the workpaper after reviewer approval
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action } = body // 'sign-off' or 'revert'

    if (action === "sign-off") {
      const result = await sql`
        UPDATE workpapers
        SET reviewed_by = ${session.user.id}, signed_off_at = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `

      const wp = result.rows[0]

      // Audit log
      await sql`
        INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_id, new_value)
        VALUES (${wp.engagement_id}, 'workpaper', ${params.id}, 'signed_off', ${session.user.id}, ${JSON.stringify(wp)})
      `

      return NextResponse.json(wp)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("POST /api/workpapers/:id/sign-off:", error)
    return NextResponse.json(
      { error: "Failed to sign off workpaper" },
      { status: 500 }
    )
  }
}
