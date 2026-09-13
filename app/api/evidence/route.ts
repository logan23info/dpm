import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const dynamic = 'force-dynamic'

// GET evidence for a workpaper
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workpaperId = searchParams.get("workpaper_id")

  if (!workpaperId) {
    return NextResponse.json({ error: "workpaper_id required" }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT id, filename, file_type, file_size, url, description, created_at
      FROM evidence
      WHERE workpaper_id = ${workpaperId}
      ORDER BY created_at DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET evidence error:", error)
    return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 })
  }
}

// POST - record evidence (URL-based, no file storage needed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workpaper_id, filename, file_type, file_size, url, description } = body

    if (!workpaper_id || !filename) {
      return NextResponse.json({ error: "workpaper_id and filename required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO evidence (workpaper_id, filename, file_type, file_size, url, description)
      VALUES (${workpaper_id}, ${filename}, ${file_type || null}, ${file_size || null}, ${url || null}, ${description || null})
      RETURNING id, filename, file_type, file_size, url, description, created_at
    `

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("POST evidence error:", error)
    return NextResponse.json({ error: "Failed to save evidence" }, { status: 500 })
  }
}

// DELETE evidence
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  try {
    await sql`DELETE FROM evidence WHERE id = ${id}`
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete evidence" }, { status: 500 })
  }
}