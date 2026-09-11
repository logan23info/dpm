import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const result = await sql`
      SELECT id, name, frameworks, period_start, period_end, status, created_at
      FROM engagements
      ORDER BY created_at DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET /api/engagements:", error)
    return NextResponse.json({ error: "Failed to fetch engagements" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, frameworks, period_start, period_end } = body

    if (!name || !frameworks || !Array.isArray(frameworks)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO engagements (name, frameworks, period_start, period_end)
      VALUES (${name}, ${JSON.stringify(frameworks)}, ${period_start || null}, ${period_end || null})
      RETURNING id, name, frameworks, period_start, period_end, status, created_at
    `

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/engagements:", error)
    return NextResponse.json({ error: "Failed to create engagement" }, { status: 500 })
  }
}
