// app/api/dashboard/route.ts
import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const engResult = await sql`
      SELECT
        e.id, e.title as name, e.status,
        e.frameworks, e.period_start, e.period_end, e.created_at,
        COUNT(DISTINCT w.id)::int                                              AS wp_total,
        COUNT(DISTINCT w.id) FILTER (WHERE w.signed_off_at IS NOT NULL)::int  AS wp_signed,
        COUNT(DISTINCT w.id) FILTER (WHERE w.test_result = 'effective')::int  AS wp_effective,
        COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'open')::int            AS find_open,
        COUNT(DISTINCT f.id) FILTER (WHERE f.severity = 'critical')::int      AS find_critical
      FROM engagements e
      LEFT JOIN workpapers w ON w.engagement_id = e.id
      LEFT JOIN findings   f ON f.engagement_id = e.id
      GROUP BY e.id, e.title, e.status, e.frameworks, e.period_start, e.period_end, e.created_at
      ORDER BY e.created_at DESC
    `
    const rows = engResult.rows as any[]
    const totalEng         = rows.length
    const openFindings     = rows.reduce((s, r) => s + (r.find_open    || 0), 0)
    const critical         = rows.reduce((s, r) => s + (r.find_critical || 0), 0)
    const effValues        = rows.filter(r => r.wp_total > 0).map(r => Math.round((r.wp_effective / r.wp_total) * 100))
    const avgEffectiveness = effValues.length > 0 ? Math.round(effValues.reduce((a, b) => a + b, 0) / effValues.length) : 0
    return NextResponse.json(
      { engagements: rows, stats: { totalEng, openFindings, critical, avgEffectiveness } },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('Dashboard:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
