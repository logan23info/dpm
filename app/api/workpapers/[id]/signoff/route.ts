import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { action, reviewer_name } = body

    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 })
    }

    const wp = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wp.rows.length === 0) {
      return NextResponse.json({ error: "Workpaper not found" }, { status: 404 })
    }

    if (action === "signoff") {
      const result = await sql`
        UPDATE workpapers
        SET
          reviewed_by = ${reviewer_name || "Reviewer"},
          signed_off_at = NOW(),
          updated_at = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      return NextResponse.json({
        success: true,
        message: "Workpaper signed off successfully",
        workpaper: result.rows[0],
      })
    }

    if (action === "revert") {
      const result = await sql`
        UPDATE workpapers
        SET reviewed_by = NULL, signed_off_at = NULL, updated_at = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `
      return NextResponse.json({
        success: true,
        message: "Sign-off reverted",
        workpaper: result.rows[0],
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("Sign-off error:", error)
    return NextResponse.json({ error: "Failed to process sign-off" }, { status: 500 })
  }
}
