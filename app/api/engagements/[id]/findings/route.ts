import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT f.id, f.title, f.severity, f.status, f.description, f.due_date
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${params.id}
      ORDER BY f.created_at DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET /api/engagements/:id/findings:", error)
    return NextResponse.json({ error: "Failed to fetch findings" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { title, severity, description, due_date, workpaper_id } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO findings (workpaper_id, title, severity, description, due_date)
      VALUES (${workpaper_id || null}, ${title}, ${severity || "medium"}, ${description || null}, ${due_date || null})
      RETURNING id, title, severity, status, description, due_date
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST /api/engagements/:id/findings:", error)
    return NextResponse.json({ error: "Failed to create finding" }, { status: 500 })
  }
}
