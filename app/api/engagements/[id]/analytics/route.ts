// app/api/engagements/[id]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import controls from '@/lib/controls'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    // 1. Workpapers summary
    const wpResult = await sql`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE test_result = 'effective')    AS effective,
        COUNT(*) FILTER (WHERE test_result = 'ineffective')  AS ineffective,
        COUNT(*) FILTER (WHERE test_result = 'partial')      AS partial,
        COUNT(*) FILTER (WHERE signed_off_at IS NOT NULL)    AS signed_off
      FROM workpapers
      WHERE engagement_id = ${id}
    `
    const wp = wpResult.rows[0]
    const total     = parseInt(wp.total)     || 0
    const effective = parseInt(wp.effective) || 0
    const effectiveness = total > 0 ? Math.round((effective / total) * 100) : 0

    // 2. Findings by status — direct on engagement_id (no JOIN)
    const findingsByStatus = await sql`
      SELECT status, COUNT(*) AS count
      FROM findings
      WHERE engagement_id = ${id}
      GROUP BY status
    `

    // 3. Findings by severity — direct on engagement_id
    const findingsBySeverity = await sql`
      SELECT severity, COUNT(*) AS count
      FROM findings
      WHERE engagement_id = ${id}
      GROUP BY severity
    `

    // 4. Risk by domain — derive domain from control library
    const wpControls = await sql`
      SELECT control_id,
             COUNT(*)                                             AS total,
             COUNT(*) FILTER (WHERE test_result = 'effective')   AS effective
      FROM workpapers
      WHERE engagement_id = ${id}
      GROUP BY control_id
    `

    // Map control_id → domain using the library
    const domainMap = new Map<string, { total: number; effective: number }>()
    for (const row of wpControls.rows) {
      const control = controls.get(row.control_id)
      const domain = control?.domain || 'Other'
      const existing = domainMap.get(domain) || { total: 0, effective: 0 }
      domainMap.set(domain, {
        total:     existing.total     + parseInt(row.total),
        effective: existing.effective + parseInt(row.effective),
      })
    }
    const riskByDomain = Array.from(domainMap.entries()).map(([domain, v]) => ({
      domain,
      total: v.total,
      effective: v.effective,
      effectiveness: v.total > 0 ? Math.round((v.effective / v.total) * 100) : 0,
    }))

    // 5. Remediation progress — direct on engagement_id
    const remediationResult = await sql`
      SELECT
        severity,
        COUNT(*) FILTER (WHERE status = 'open')                          AS open,
        COUNT(*) FILTER (WHERE status IN ('remediated', 'closed'))       AS closed,
        COUNT(*)                                                          AS total
      FROM findings
      WHERE engagement_id = ${id}
      GROUP BY severity
    `
    const remediationProgress = (remediationResult.rows as any[]).map(r => ({
      severity: r.severity,
      open:     parseInt(r.open),
      closed:   parseInt(r.closed),
      total:    parseInt(r.total),
      percent:  parseInt(r.total) > 0
        ? Math.round((parseInt(r.closed) / parseInt(r.total)) * 100)
        : 0,
    }))

    // 6. Smart summary
    const allFindings = await sql`
      SELECT severity, status, due_date
      FROM findings
      WHERE engagement_id = ${id}
    `
    const now = new Date()
    const overdue          = (allFindings.rows as any[]).filter(f => f.due_date && new Date(f.due_date) < now && f.status === 'open').length
    const openFindings     = (allFindings.rows as any[]).filter(f => f.status === 'open').length
    const criticalFindings = (allFindings.rows as any[]).filter(f => f.severity === 'critical' && f.status === 'open').length

    const weakestDomain = riskByDomain.length > 0
      ? riskByDomain.reduce((a, b) => a.effectiveness < b.effectiveness ? a : b)
      : null

    const smartSummary = {
      effectiveness,
      totalControls:     total,
      effectiveControls: effective,
      signedOff:         parseInt(wp.signed_off) || 0,
      openFindings,
      criticalFindings,
      overdueFindings:   overdue,
      weakestDomain:     weakestDomain?.domain || 'N/A',
      weakestDomainPct:  weakestDomain?.effectiveness || 0,
      insights: [
        `Control Effectiveness: ${effectiveness}% (${effective} of ${total} controls)`,
        weakestDomain
          ? `Highest Risk Domain: ${weakestDomain.domain} (${weakestDomain.effectiveness}% effective)`
          : null,
        openFindings > 0
          ? `Open Findings: ${openFindings} requiring attention`
          : 'No open findings — all findings resolved',
        criticalFindings > 0
          ? `Critical: ${criticalFindings} finding(s) require immediate action`
          : null,
        overdue > 0
          ? `Overdue: ${overdue} finding(s) past target remediation date`
          : 'All findings within target date',
      ].filter(Boolean),
      priorities: [
        overdue > 0
          ? `Address ${overdue} overdue finding(s) immediately`
          : null,
        criticalFindings > 0
          ? `Remediate ${criticalFindings} critical finding(s)`
          : null,
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
        effective,
        ineffective: parseInt(wp.ineffective) || 0,
        partial:     parseInt(wp.partial)     || 0,
        signedOff:   parseInt(wp.signed_off)  || 0,
      },
      findingsByStatus:   findingsByStatus.rows,
      findingsBySeverity: findingsBySeverity.rows,
      riskByDomain,
      remediationProgress,
      smartSummary,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}