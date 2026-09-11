import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import * as XLSX from "xlsx"

// Flexible column matcher
function findColumn(headers: string[], keywords: string[]): string | null {
  return headers.find(h =>
    keywords.some(k => h.toLowerCase().replace(/\s+/g, "").includes(k.toLowerCase()))
  ) || null
}

function mapSeverity(testResult: string): string {
  const r = testResult?.toLowerCase() || ""
  if (r.includes("critical")) return "critical"
  if (r.includes("ineffective")) return "high"
  if (r.includes("partial")) return "medium"
  return "low"
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Parse workbook
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in spreadsheet" }, { status: 400 })
    }

    const headers = Object.keys(rows[0])

    // Flexible column detection
    const controlCol  = findColumn(headers, ["controlid", "control", "id", "ref", "clause"])
    const resultCol   = findColumn(headers, ["testresult", "result", "status", "compliance", "effectiveness"])
    const findingCol  = findColumn(headers, ["finding", "gap", "issue", "observation", "exception"])
    const ownerCol    = findColumn(headers, ["owner", "responsible", "assignee"])
    const titleCol    = findColumn(headers, ["title", "name", "description", "control"])

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors:  [] as string[],
    }

    for (const row of rows) {
      const controlId  = controlCol  ? String(row[controlCol]).trim()  : ""
      const testResult = resultCol   ? String(row[resultCol]).trim()   : ""
      const finding    = findingCol  ? String(row[findingCol]).trim()  : ""
      const title      = titleCol    ? String(row[titleCol]).trim()    : finding || controlId

      if (!controlId) {
        results.skipped.push("Row skipped: no control ID")
        continue
      }

      // Create finding if ineffective/non-compliant/gap found
      const isIssue = ["ineffective", "non-compliant", "noncompliant", "fail", "gap", "partial"]
        .some(k => testResult.toLowerCase().includes(k))

      if (!isIssue && !finding) {
        results.skipped.push(`${controlId}: ${testResult || "no issue"}`)
        continue
      }

      try {
        const result = await sql`
          INSERT INTO findings (workpaper_id, title, severity, status, description)
          VALUES (
            NULL,
            ${title || `Finding: ${controlId}`},
            ${mapSeverity(testResult)},
            'open',
            ${finding || `Control ${controlId} assessed as: ${testResult}`}
          )
          RETURNING id
        `
        results.created.push(result.rows[0].id)
      } catch (err: any) {
        results.errors.push(`${controlId}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created: results.created.length,
      skipped: results.skipped.length,
      errors:  results.errors.length,
      details: results,
      totalRows: rows.length,
    })

  } catch (error: any) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 })
  }
}
