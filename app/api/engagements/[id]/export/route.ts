// app/api/engagements/[id]/export/route.ts
// Full gap analysis Excel export — 5 sheets
// Fixed: findings use engagement_id directly (no broken JOIN)
// New: AI Governance Record sheet

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import * as XLSX from 'xlsx'
import controls from '@/lib/controls'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    // Engagement
    const engResult = await sql`
      SELECT title as name, frameworks, period_start, period_end, status
      FROM engagements WHERE id = ${id}
    `
    if (engResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const eng = engResult.rows[0] as any

    // Workpapers
    const wpResult = await sql`
      SELECT control_id, implementation_status, test_result, residual_risk,
             exceptions_noted, conclusion, version, signed_off_at,
             reviewed_by, updated_at
      FROM workpapers WHERE engagement_id = ${id}
      ORDER BY control_id ASC
    `

    // Findings — direct engagement_id (FIXED)
    const findResult = await sql`
      SELECT title, severity, status, description, control_id,
             due_date, management_response, agreed_action, action_owner,
             remediated_date, retest_result, origin, created_at
      FROM findings
      WHERE engagement_id = ${id}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1 WHEN 'high' THEN 2
          WHEN 'medium'   THEN 3 WHEN 'low'  THEN 4 ELSE 5
        END
    `

    // AI analyses
    const aiResult = await sql`
      SELECT a.control_id, a.mode, a.model,
             a.disposition, a.dispositioned_by, a.dispositioned_at,
             a.auditor_note, a.created_at
      FROM ai_analyses a
      JOIN workpapers w ON a.workpaper_id = w.id
      WHERE w.engagement_id = ${id}
      ORDER BY a.created_at DESC
    `
    const aiRows = aiResult.rows as any[]

    // Scoping decisions
    const scopeResult = await sql`
      SELECT control_id, in_scope, scoping_rationale, scoped_by, scoped_at
      FROM engagement_scope WHERE engagement_id = ${id}
    `

    const wp = wpResult.rows as any[]
    const findings = findResult.rows as any[]
    const scopeRows = scopeResult.rows as any[]

    const total     = wp.length
    const effective = wp.filter(w => w.test_result === 'effective').length
    const effectiveness = total > 0 ? Math.round((effective / total) * 100) : 0
    const openFindings  = findings.filter(f => f.status === 'open').length
    const criticalFindings = findings.filter(f => f.severity === 'critical').length

    const workbook = XLSX.utils.book_new()

    // ── Sheet 1: Executive Summary ────────────────────────────────────────
    const summaryData = [
      ['DPM — Audit Report & Gap Analysis'],
      ['Generated', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
      [],
      ['ENGAGEMENT'],
      ['Name',       eng.name],
      ['Frameworks', Array.isArray(eng.frameworks) ? eng.frameworks.join(', ') : eng.frameworks],
      ['Period',     `${eng.period_start || '—'} to ${eng.period_end || '—'}`],
      ['Status',     eng.status],
      [],
      ['CONTROL EFFECTIVENESS'],
      ['Total Controls Tested',    total],
      ['Effective',               effective],
      ['Partially Effective',     wp.filter(w => w.test_result === 'partial').length],
      ['Ineffective',             wp.filter(w => w.test_result === 'ineffective').length],
      ['Not Tested',              wp.filter(w => !w.test_result || w.test_result === 'not-tested').length],
      ['Signed Off',              wp.filter(w => w.signed_off_at).length],
      ['Overall Effectiveness',   `${effectiveness}%`],
      [],
      ['FINDINGS SUMMARY'],
      ['Total Findings',          findings.length],
      ['Open',                    openFindings],
      ['Critical',                criticalFindings],
      ['High',                    findings.filter(f => f.severity === 'high').length],
      ['Medium',                  findings.filter(f => f.severity === 'medium').length],
      ['Low',                     findings.filter(f => f.severity === 'low').length],
      ['Remediated / Closed',     findings.filter(f => ['remediated', 'closed'].includes(f.status)).length],
      [],
      ['AUDIT OPINION'],
      [effectiveness >= 80
        ? 'REASONABLE ASSURANCE — Controls are generally effective with minor exceptions.'
        : effectiveness >= 60
        ? 'QUALIFIED OPINION — Controls are partially effective. Significant gaps require remediation.'
        : 'ADVERSE OPINION — Controls are largely ineffective. Immediate management attention required.'],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 55 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary')

    // ── Sheet 2: Workpapers (RCM) ─────────────────────────────────────────
    const wpHeaders = [
      'Control ID', 'Clause Reference', 'Domain', 'Framework',
      'Implementation Status', 'Test Result', 'Residual Risk',
      'Exceptions Noted', 'Conclusion', 'Version', 'Signed Off By', 'Sign-Off Date'
    ]
    const wpRows = wp.map(w => {
      const ctrl = controls.get(w.control_id)
      return [
        w.control_id,
        ctrl?.clause_ref || '—',
        ctrl?.domain || '—',
        ctrl?.framework || '—',
        w.implementation_status || '—',
        w.test_result || 'Not Tested',
        w.residual_risk || '—',
        w.exceptions_noted || 'None',
        w.conclusion || '—',
        w.version || 1,
        w.reviewed_by || '—',
        w.signed_off_at ? new Date(w.signed_off_at).toLocaleDateString('en-GB') : 'Pending',
      ]
    })
    const wpSheet = XLSX.utils.aoa_to_sheet([wpHeaders, ...wpRows])
    wpSheet['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 12 },
      { wch: 22 }, { wch: 15 }, { wch: 14 },
      { wch: 40 }, { wch: 40 }, { wch: 8 }, { wch: 18 }, { wch: 14 }
    ]
    XLSX.utils.book_append_sheet(workbook, wpSheet, 'Workpapers (RCM)')

    // ── Sheet 3: Findings & Gap Analysis ──────────────────────────────────
    const findHeaders = [
      'Control ID', 'Finding Title', 'Severity', 'Status',
      'Description', 'Management Response', 'Agreed Action',
      'Action Owner', 'Target Date', 'Remediated Date',
      'Retest Result', 'Origin'
    ]
    const findRows = findings.map(f => [
      f.control_id || '—',
      f.title,
      (f.severity || 'medium').toUpperCase(),
      f.status,
      f.description || '—',
      f.management_response || 'Awaiting response',
      f.agreed_action || '—',
      f.action_owner || '—',
      f.due_date ? new Date(f.due_date).toLocaleDateString('en-GB') : '—',
      f.remediated_date ? new Date(f.remediated_date).toLocaleDateString('en-GB') : '—',
      f.retest_result || '—',
      f.origin || 'auditor_authored',
    ])
    const findSheet = XLSX.utils.aoa_to_sheet([findHeaders, ...findRows])
    findSheet['!cols'] = [
      { wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 15 },
      { wch: 45 }, { wch: 20 }, { wch: 35 },
      { wch: 18 }, { wch: 14 }, { wch: 15 }, { wch: 14 }, { wch: 18 }
    ]
    XLSX.utils.book_append_sheet(workbook, findSheet, 'Findings & Gap Analysis')

    // ── Sheet 4: AI Governance Record ─────────────────────────────────────
    const aiSummary = {
      total:    aiRows.length,
      accepted: aiRows.filter(r => r.disposition === 'accepted').length,
      modified: aiRows.filter(r => r.disposition === 'modified').length,
      rejected: aiRows.filter(r => r.disposition === 'rejected').length,
      pending:  aiRows.filter(r => !r.disposition).length,
    }

    const aiGovData = [
      ['AI ASSISTANCE GOVERNANCE RECORD'],
      ['Engagement', eng.name],
      ['Generated', new Date().toLocaleDateString('en-GB')],
      [],
      ['SUMMARY'],
      ['Model Used', aiRows[0]?.model || 'openai/gpt-oss-20b (Groq)'],
      ['Role of AI', 'Decision-support only — no automated conclusions or sign-offs'],
      ['Analyses Generated', aiSummary.total],
      ['Accepted as Drafted', `${aiSummary.accepted} (${aiSummary.total > 0 ? Math.round(aiSummary.accepted / aiSummary.total * 100) : 0}%)`],
      ['Accepted with Changes', `${aiSummary.modified} (${aiSummary.total > 0 ? Math.round(aiSummary.modified / aiSummary.total * 100) : 0}%)`],
      ['Rejected', `${aiSummary.rejected} (${aiSummary.total > 0 ? Math.round(aiSummary.rejected / aiSummary.total * 100) : 0}%)`],
      ['Awaiting Disposition', aiSummary.pending],
      ['Conclusions set by AI', 0],
      ['Sign-offs by AI', 0],
      [],
      ['ASSURANCE STATEMENT'],
      ['All AI-generated analyses were reviewed and dispositioned by a qualified auditor.',
       'No workpaper conclusion, test result, or sign-off was determined by AI.',
       'This record is available for inspection by regulators or audit committees.'],
      [],
      ['DETAIL LOG'],
      ['Control ID', 'Mode', 'Model', 'Disposition', 'Auditor', 'Date', 'Note'],
      ...aiRows.map(r => [
        r.control_id || '—',
        r.mode,
        r.model,
        r.disposition || 'pending',
        r.dispositioned_by || '—',
        r.dispositioned_at ? new Date(r.dispositioned_at).toLocaleDateString('en-GB') : '—',
        r.auditor_note || '—',
      ]),
    ]
    const aiSheet = XLSX.utils.aoa_to_sheet(aiGovData)
    aiSheet['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 22 },
      { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 40 }
    ]
    XLSX.utils.book_append_sheet(workbook, aiSheet, 'AI Governance Record')

    // ── Sheet 5: GDPR Article Mapping ─────────────────────────────────────
    const gdprControls = controls.byFramework('GDPR')
    const mappingHeaders = ['Control ID', 'Clause Reference', 'Domain', 'Control Objective', 'Authority URL', 'Cross-Framework Mappings']
    const mappingRows = gdprControls.map(c => [
      c.id, c.clause_ref, c.domain, c.control_objective,
      controls.getAuthorityUrl(c.id),
      c.cross_framework_refs.join(', ') || '—',
    ])
    const mapSheet = XLSX.utils.aoa_to_sheet([mappingHeaders, ...mappingRows])
    mapSheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 45 }, { wch: 60 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(workbook, mapSheet, 'GDPR Article Mapping')

    // Generate
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const filename = `GAP-ANALYSIS-${(eng.name || 'Report').replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
