import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import * as XLSX from "xlsx"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    // Fetch engagement
    const engResult = await sql`
      SELECT title as name, frameworks, period_start, period_end, status
      FROM engagements WHERE id = ${id}
    `
    if (engResult.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const eng = engResult.rows[0]

    // Fetch workpapers
    const wpResult = await sql`
      SELECT control_id, implementation_status, test_result, residual_risk,
             exceptions_noted, conclusion, version, signed_off_at, updated_at
      FROM workpapers WHERE engagement_id = ${id}
      ORDER BY control_id ASC
    `

    // Fetch findings
    const findResult = await sql`
      SELECT f.title, f.severity, f.status, f.description, f.due_date
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
      ORDER BY f.severity DESC, f.created_at ASC
    `

    // Analytics summary
    const total = wpResult.rows.length
    const effective = wpResult.rows.filter(w => w.test_result === "effective").length
    const effectiveness = total > 0 ? Math.round((effective / total) * 100) : 0
    const openFindings = findResult.rows.filter(f => f.status === "open").length
    const criticalFindings = findResult.rows.filter(f => f.severity === "critical").length

    const workbook = XLSX.utils.book_new()

    // ── Sheet 1: Executive Summary ──────────────────────────────
    const summaryData = [
      ["DPM — Gap Analysis Report"],
      ["Generated", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })],
      [],
      ["ENGAGEMENT DETAILS"],
      ["Name", eng.name],
      ["Frameworks", Array.isArray(eng.frameworks) ? eng.frameworks.join(", ") : eng.frameworks],
      ["Period", `${eng.period_start || "—"} to ${eng.period_end || "—"}`],
      ["Status", eng.status],
      [],
      ["AUDIT SUMMARY"],
      ["Total Controls Tested", total],
      ["Effective Controls", effective],
      ["Control Effectiveness", `${effectiveness}%`],
      ["Ineffective Controls", wpResult.rows.filter(w => w.test_result === "ineffective").length],
      ["Partially Effective", wpResult.rows.filter(w => w.test_result === "partial").length],
      ["Not Tested", wpResult.rows.filter(w => !w.test_result || w.test_result === "not-tested").length],
      ["Signed Off", wpResult.rows.filter(w => w.signed_off_at).length],
      [],
      ["FINDINGS SUMMARY"],
      ["Total Findings", findResult.rows.length],
      ["Open Findings", openFindings],
      ["Critical Findings", criticalFindings],
      ["High Findings", findResult.rows.filter(f => f.severity === "high").length],
      ["Medium Findings", findResult.rows.filter(f => f.severity === "medium").length],
      ["Low Findings", findResult.rows.filter(f => f.severity === "low").length],
      [],
      ["AUDITOR OPINION"],
      [effectiveness >= 80
        ? "REASONABLE ASSURANCE — Controls are generally effective with minor exceptions noted."
        : effectiveness >= 60
        ? "QUALIFIED OPINION — Controls are partially effective. Significant gaps require remediation."
        : "ADVERSE OPINION — Controls are largely ineffective. Immediate management attention required."],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet["!cols"] = [{ wch: 35 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary")

    // ── Sheet 2: Workpapers (RCM) ───────────────────────────────
    const wpHeaders = [
      "Control ID", "Implementation Status", "Test Result",
      "Residual Risk", "Exceptions Noted", "Conclusion",
      "Version", "Signed Off", "Last Updated"
    ]
    const wpRows = wpResult.rows.map(w => [
      w.control_id,
      w.implementation_status || "—",
      w.test_result || "Not Tested",
      w.residual_risk || "—",
      w.exceptions_noted || "None",
      w.conclusion || "—",
      w.version || 1,
      w.signed_off_at ? new Date(w.signed_off_at).toLocaleDateString("en-GB") : "Pending",
      w.updated_at ? new Date(w.updated_at).toLocaleDateString("en-GB") : "—",
    ])

    const wpSheet = XLSX.utils.aoa_to_sheet([wpHeaders, ...wpRows])
    wpSheet["!cols"] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 40 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(workbook, wpSheet, "Workpapers (RCM)")

    // ── Sheet 3: Findings & Gap Analysis ────────────────────────
    const findHeaders = [
      "Finding Title", "Severity", "Status", "Description", "Target Date", "Recommendation"
    ]
    const findRows = findResult.rows.map(f => [
      f.title,
      (f.severity || "medium").toUpperCase(),
      f.status || "open",
      f.description || "—",
      f.due_date ? new Date(f.due_date).toLocaleDateString("en-GB") : "Not set",
      "Review and remediate in line with GDPR obligations",
    ])

    const findSheet = XLSX.utils.aoa_to_sheet([findHeaders, ...findRows])
    findSheet["!cols"] = [
      { wch: 40 }, { wch: 12 }, { wch: 15 },
      { wch: 50 }, { wch: 15 }, { wch: 50 }
    ]
    XLSX.utils.book_append_sheet(workbook, findSheet, "Findings & Gap Analysis")

    // ── Sheet 4: GDPR Article Mapping ───────────────────────────
    const gdprMapping = [
      ["Control ID", "GDPR Article", "Article Title", "EUR-Lex Reference"],
      ["GDPR-1",  "Art. 5",     "Principles relating to processing",          "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-2",  "Art. 6",     "Lawfulness of processing",                    "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-3",  "Art. 7",     "Conditions for consent",                      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-4",  "Art. 13-14", "Information to be provided",                  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-5",  "Art. 15-22", "Rights of the data subject",                  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-6",  "Art. 25",    "Data protection by design and by default",    "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-7",  "Art. 28",    "Processor obligations (DPA)",                 "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-8",  "Art. 30",    "Records of Processing Activities (RoPA)",     "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-9",  "Art. 32",    "Security of processing",                      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-10", "Art. 33-34", "Breach notification",                         "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-11", "Art. 35",    "DPIA",                                        "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-12", "Art. 37-39", "Data Protection Officer",                     "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-13", "Art. 44-49", "International transfers",                     "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
      ["GDPR-14", "Art. 83",    "Administrative fines",                        "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"],
    ]
    const gdprSheet = XLSX.utils.aoa_to_sheet(gdprMapping)
    gdprSheet["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 45 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(workbook, gdprSheet, "GDPR Article Mapping")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    const filename = `GAP-ANALYSIS-${eng.name.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
