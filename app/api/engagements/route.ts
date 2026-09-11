import { auth } from "@/lib/auth"
import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/engagements
 * List engagements for the current user's organization
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's org_id
    const userResult = await sql`
      SELECT org_id FROM users WHERE id = ${session.user.id}
    `
    const orgId = userResult.rows[0]?.org_id

    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 })
    }

    // List engagements
    const result = await sql`
      SELECT 
        id, name, frameworks, period_start, period_end, status, created_at
      FROM engagements
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET /api/engagements:", error)
    return NextResponse.json(
      { error: "Failed to fetch engagements" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/engagements
 * Create a new engagement
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, frameworks, period_start, period_end } = body

    if (!name || !frameworks || !Array.isArray(frameworks)) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    // Get user's org_id
    const userResult = await sql`
      SELECT org_id FROM users WHERE id = ${session.user.id}
    `
    const orgId = userResult.rows[0]?.org_id

    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 })
    }

    // Create engagement
    const result = await sql`
      INSERT INTO engagements (org_id, name, frameworks, period_start, period_end, created_by)
      VALUES (${orgId}, ${name}, ${JSON.stringify(frameworks)}, ${period_start || null}, ${period_end || null}, ${session.user.id})
      RETURNING id, name, frameworks, period_start, period_end, status, created_at
    `

    // Log to audit trail
    await sql`
      INSERT INTO audit_log (engagement_id, entity_type, entity_id, action, actor_id, new_value)
      VALUES (${result.rows[0].id}, 'engagement', ${result.rows[0].id}, 'created', ${session.user.id}, ${JSON.stringify(result.rows[0])})
    `

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/engagements:", error)
    return NextResponse.json(
      { error: "Failed to create engagement" },
      { status: 500 }
    )
  }
}
