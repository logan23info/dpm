import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { engagement_id, control_id } = body

    if (!engagement_id || !control_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const engResult = await sql`
      SELECT id FROM engagements WHERE id = ${engagement_id}
    `
    if (engResult.rows.length === 0) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO workpapers (engagement_id, control_id)
      VALUES (${engagement_id}, ${control_id})
      RETURNING id, engagement_id, control_id, version, created_at
    `

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/workpapers:", error)
    return NextResponse.json({ error: "Failed to create workpaper" }, { status: 500 })
  }
}
