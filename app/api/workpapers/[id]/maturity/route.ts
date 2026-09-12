// app/api/workpapers/[id]/maturity/route.ts
// Compute maturity score (1-5) for a workpaper based on its completeness

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

// CMMI-style maturity model for privacy controls
const MATURITY_LEVELS = {
  1: { label: 'Initial',    description: 'Ad hoc, unpredictable. No documented process.' },
  2: { label: 'Managed',   description: 'Repeatable. Basic process exists but not standardised.' },
  3: { label: 'Defined',   description: 'Documented and standardised. Process is proactive.' },
  4: { label: 'Measured',  description: 'Quantitatively managed. Metrics and monitoring in place.' },
  5: { label: 'Optimising',description: 'Continuous improvement. Proactive and adaptive.' },
}

function computeMaturity(wp: any, evidenceCount: number, findingCount: number): {
  score: number
  level: string
  description: string
  factors: { factor: string; contributes: boolean; points: number }[]
} {
  const factors = [
    {
      factor: 'Implementation status documented',
      contributes: !!wp.implementation_status && wp.implementation_status !== 'not-implemented',
      points: 1,
    },
    {
      factor: 'Test result recorded',
      contributes: !!wp.test_result && wp.test_result !== 'not-tested',
      points: 1,
    },
    {
      factor: 'Evidence attached',
      contributes: evidenceCount > 0,
      points: 1,
    },
    {
      factor: 'Conclusion documented',
      contributes: !!wp.conclusion?.trim(),
      points: 1,
    },
    {
      factor: 'Reviewed and signed off',
      contributes: !!wp.signed_off_at,
      points: 1,
    },
    {
      factor: 'Exceptions fully documented (if any)',
      contributes: wp.test_result !== 'ineffective' || !!wp.exceptions_noted?.trim(),
      points: 0, // bonus
    },
    {
      factor: 'Residual risk assessed',
      contributes: !!wp.residual_risk,
      points: 0, // bonus
    },
  ]

  const baseScore = factors.filter(f => f.contributes && f.points > 0).reduce((acc, f) => acc + f.points, 0)

  // Bonus: both bonuses add +0.5 each (for fractional scoring later rounded)
  const bonuses = factors.filter(f => f.contributes && f.points === 0).length
  const rawScore = Math.min(5, baseScore + Math.floor(bonuses / 2))

  // Effective + signed off + evidence → cap at 4 minimum for well-evidenced
  const finalScore = wp.test_result === 'effective' && wp.signed_off_at && evidenceCount > 0
    ? Math.max(rawScore, 4)
    : rawScore

  const score = Math.max(1, Math.min(5, finalScore || 1))
  const level = MATURITY_LEVELS[score as keyof typeof MATURITY_LEVELS]

  return {
    score,
    level: level.label,
    description: level.description,
    factors,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [wpResult, evidenceResult, findingResult] = await Promise.all([
      sql`SELECT * FROM workpapers WHERE id = ${params.id}`,
      sql`SELECT COUNT(*) as count FROM evidence WHERE workpaper_id = ${params.id}`,
      sql`SELECT COUNT(*) as count FROM findings WHERE workpaper_id = ${params.id}`,
    ])

    if (wpResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const wp = wpResult.rows[0] as any
    const evidenceCount = parseInt((evidenceResult.rows[0] as any).count)
    const findingCount = parseInt((findingResult.rows[0] as any).count)

    const maturity = computeMaturity(wp, evidenceCount, findingCount)

    return NextResponse.json({
      workpaper_id: params.id,
      control_id: wp.control_id,
      ...maturity,
      evidence_count: evidenceCount,
      finding_count: findingCount,
    })
  } catch (error) {
    console.error('Maturity error:', error)
    return NextResponse.json({ error: 'Failed to compute maturity' }, { status: 500 })
  }
}
