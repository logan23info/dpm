export const dynamic = "force-dynamic"

import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT id, title as name, frameworks, period_start, period_end, status, created_at
      FROM engagements WHERE id = ${params.id}
    `
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch engagement" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { status } = body
    const result = await sql`
      UPDATE engagements SET status = ${status} WHERE id = ${params.id}
      RETURNING id, title as name, frameworks, period_start, period_end, status
    `
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: "Failed to update engagement" }, { status: 500 })
  }
}
