export const dynamic = "force-dynamic"

import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT id, control_id, version, implementation_status, test_result,
             residual_risk, conclusion, signed_off_at, updated_at
      FROM workpapers WHERE engagement_id = ${params.id}
      ORDER BY created_at ASC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("GET /api/engagements/:id/workpapers:", error)
    return NextResponse.json({ error: "Failed to fetch workpapers" }, { status: 500 })
  }
}
