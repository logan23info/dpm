import { NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    // 1. Workpapers summary
    const wpResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE test_result = 'effective') as effective,
        COUNT(*) FILTER (WHERE test_result = 'ineffective') as ineffective,
        COUNT(*) FILTER (WHERE test_result = 'partial') as partial,
        COUNT(*) FILTER (WHERE signed_off_at IS NOT NULL) as signed_off
      FROM workpapers WHERE engagement_id = ${id}
    `
    const wp = wpResult.rows[0]
    const total = parseInt(wp.total) || 0
    const effective = parseInt(wp.effective) || 0
    const effectiveness = total > 0 ? Math.round((effective / total) * 100) : 0

    // 2. Findings by status
    const findingsByStatus = await sql`
      SELECT status, COUNT(*) as count
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
      GROUP BY status
    `

    // 3. Findings by severity
    const findingsBySeverity = await sql`
      SELECT severity, COUNT(*) as count
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
      GROUP BY severity
    `

    // 4. Risk by domain (from control_id prefix)
    const domainResult = await sql`
      SELECT
        CASE
          WHEN control_id LIKE 'GDPR-%' THEN 'GDPR'
          WHEN control_id LIKE 'ISO%' THEN 'ISO 27701'
          WHEN control_id LIKE 'DPDP%' THEN 'DPDP Act'
          WHEN control_id LIKE 'NIST%' THEN 'NIST'
          WHEN control_id LIKE 'SOC%' THEN 'SOC 2'
          ELSE 'Other'
        END as domain,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE test_result = 'effective') as effective
      FROM workpapers
      WHERE engagement_id = ${id}
      GROUP BY domain
    `

    const riskByDomain = domainResult.rows.map(r => ({
      domain: r.domain,
      total: parseInt(r.total),
      effective: parseInt(r.effective),
      effectiveness: parseInt(r.total) > 0
        ? Math.round((parseInt(r.effective) / parseInt(r.total)) * 100)
        : 0,
    }))

    // 5. Remediation progress (findings by severity closed vs open)
    const remediationResult = await sql`
      SELECT
        severity,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'closed' OR status = 'remediated') as closed,
        COUNT(*) as total
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
      GROUP BY severity
    `

    const remediationProgress = remediationResult.rows.map(r => ({
      severity: r.severity,
      open: parseInt(r.open),
      closed: parseInt(r.closed),
      total: parseInt(r.total),
      percent: parseInt(r.total) > 0
        ? Math.round((parseInt(r.closed) / parseInt(r.total)) * 100)
        : 0,
    }))

    // 6. Smart summary (rule-based)
    const allFindings = await sql`
      SELECT f.severity, f.status, f.due_date
      FROM findings f
      JOIN workpapers w ON f.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
    `

    const overdue = allFindings.rows.filter(f =>
      f.due_date && new Date(f.due_date) < new Date() && f.status === "open"
    ).length

    const openFindings = allFindings.rows.filter(f => f.status === "open").length
    const criticalFindings = allFindings.rows.filter(f =>
      f.severity === "critical" && f.status === "open"
    ).length

    const weakestDomain = riskByDomain.length > 0
      ? riskByDomain.reduce((a, b) => a.effectiveness < b.effectiveness ? a : b)
      : null

    const smartSummary = {
      effectiveness,
      totalControls: total,
      effectiveControls: effective,
      signedOff: parseInt(wp.signed_off),
      openFindings,
      criticalFindings,
      overdueFindings: overdue,
      weakestDomain: weakestDomain?.domain || "N/A",
      weakestDomainPct: weakestDomain?.effectiveness || 0,
      insights: [
        `Control Effectiveness: ${effectiveness}% (${effective} of ${total} controls)`,
        weakestDomain ? `Highest Risk Domain: ${weakestDomain.domain} (${weakestDomain.effectiveness}% effective)` : null,
        openFindings > 0 ? `Open Findings: ${openFindings} requiring attention` : "No open findings",
        criticalFindings > 0 ? `Critical Findings: ${criticalFindings} require immediate action` : null,
        overdue > 0 ? `Overdue: ${overdue} findings past target date` : "All findings within target date",
      ].filter(Boolean),
      priorities: [
        overdue > 0 ? `Address ${overdue} overdue finding(s) immediately` : null,
        criticalFindings > 0 ? `Remediate ${criticalFindings} critical finding(s)` : null,
        weakestDomain && weakestDomain.effectiveness < 70
          ? `Strengthen ${weakestDomain.domain} controls (${weakestDomain.effectiveness}% effective)`
          : null,
        parseInt(wp.signed_off) < total
          ? `Complete sign-off on ${total - parseInt(wp.signed_off)} remaining workpaper(s)`
          : null,
      ].filter(Boolean),
    }

    return NextResponse.json({
      effectiveness,
      workpapers: {
        total,
        effective: parseInt(wp.effective),
        ineffective: parseInt(wp.ineffective),
        partial: parseInt(wp.partial),
        signedOff: parseInt(wp.signed_off),
      },
      findingsByStatus: findingsByStatus.rows,
      findingsBySeverity: findingsBySeverity.rows,
      riskByDomain,
      remediationProgress,
      smartSummary,
    })

  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
