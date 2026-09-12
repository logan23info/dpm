// app/api/ai/analyses/route.ts
// GET saved AI analyses for a workpaper

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workpaperId = searchParams.get('workpaper_id')

  if (!workpaperId) {
    return NextResponse.json({ error: 'workpaper_id required' }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT
        id, mode, control_id, analysis, model,
        disposition, modified_text, auditor_note,
        dispositioned_by, dispositioned_at, created_at
      FROM ai_analyses
      WHERE workpaper_id = ${workpaperId}
      ORDER BY created_at DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/ai/analyses:', error)
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 })
  }
}
