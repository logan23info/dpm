// app/api/engagements/[id]/contradiction-check/route.ts
// Checks all workpapers for logical inconsistencies
// No AI needed — pure rule-based logic

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import controls from '@/lib/controls'

interface Contradiction {
  workpaper_id: string
  control_id: string
  type: string
  message: string
  severity: 'error' | 'warning'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wpResult = await sql`
      SELECT id, control_id, implementation_status, test_result,
             residual_risk, exceptions_noted, conclusion,
             signed_off_at
      FROM workpapers WHERE engagement_id = ${params.id}
    `
    const wps = wpResult.rows as any[]
    const contradictions: Contradiction[] = []

    for (const wp of wps) {
      const ctrl = controls.get(wp.control_id)

      // Rule 1: Effective test result but exceptions noted
      if (wp.test_result === 'effective' && wp.exceptions_noted?.trim()) {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'effective_with_exceptions',
          message: `Test result is "effective" but exceptions are noted. Effective controls should have no exceptions.`,
          severity: 'error',
        })
      }

      // Rule 2: Effective test but high/critical residual risk
      if (wp.test_result === 'effective' &&
          ['high', 'critical'].includes(wp.residual_risk)) {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'effective_high_risk',
          message: `Test result is "effective" but residual risk is "${wp.residual_risk}". Effective controls should reduce residual risk to low or medium.`,
          severity: 'error',
        })
      }

      // Rule 3: Implemented but ineffective
      if (wp.implementation_status === 'implemented' &&
          wp.test_result === 'ineffective') {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'implemented_ineffective',
          message: `Control is marked "implemented" but test result is "ineffective". If implemented, review why it is not operating effectively.`,
          severity: 'warning',
        })
      }

      // Rule 4: Not implemented but tested
      if (wp.implementation_status === 'not-implemented' &&
          wp.test_result && wp.test_result !== 'not-tested') {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'not_implemented_tested',
          message: `Control is "not implemented" but a test result is recorded. Testing a non-existent control is inconsistent.`,
          severity: 'error',
        })
      }

      // Rule 5: Key control not tested
      if (ctrl?.key_control && (!wp.test_result || wp.test_result === 'not-tested')) {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'key_control_not_tested',
          message: `This is a key control (${ctrl.clause_ref}) but has not been tested. Key controls require evidence of testing.`,
          severity: 'warning',
        })
      }

      // Rule 6: Signed off with no test result
      if (wp.signed_off_at && (!wp.test_result || wp.test_result === 'not-tested')) {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'signed_off_no_test',
          message: `Workpaper is signed off but has no test result. Sign-off should only occur after testing is complete.`,
          severity: 'error',
        })
      }

      // Rule 7: Critical residual risk but no exceptions documented
      if (wp.residual_risk === 'critical' && !wp.exceptions_noted?.trim()) {
        contradictions.push({
          workpaper_id: wp.id,
          control_id: wp.control_id,
          type: 'critical_risk_no_exceptions',
          message: `Residual risk is "critical" but no exceptions are documented. Critical risk should be supported by detailed exception notes.`,
          severity: 'warning',
        })
      }

      // Rule 8: Conclusion contradicts test result
      if (wp.conclusion && wp.test_result) {
        const conc = wp.conclusion.toLowerCase()
        if (wp.test_result === 'ineffective' &&
            (conc.includes('effective') || conc.includes('adequate') || conc.includes('satisfactory'))) {
          contradictions.push({
            workpaper_id: wp.id,
            control_id: wp.control_id,
            type: 'conclusion_contradicts_result',
            message: `Conclusion appears to indicate effectiveness but test result is "ineffective". Review the conclusion text.`,
            severity: 'warning',
          })
        }
      }
    }

    const summary = {
      total: wps.length,
      clean: wps.length - new Set(contradictions.map(c => c.workpaper_id)).size,
      withIssues: new Set(contradictions.map(c => c.workpaper_id)).size,
      errors: contradictions.filter(c => c.severity === 'error').length,
      warnings: contradictions.filter(c => c.severity === 'warning').length,
    }

    return NextResponse.json({ contradictions, summary })
  } catch (error) {
    console.error('Contradiction check error:', error)
    return NextResponse.json({ error: 'Check failed' }, { status: 500 })
  }
}
