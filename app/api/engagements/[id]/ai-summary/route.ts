// app/api/engagements/[id]/ai-summary/route.ts
// Generates an executive audit summary across all workpapers using Groq
// One call, entire engagement picture

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
import controls from '@/lib/controls'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getActor(req)
    const apiKey = process.env.DPM_Key
    if (!apiKey) {
      return NextResponse.json({ error: 'DPM_Key not configured' }, { status: 500 })
    }

    // Get engagement + workpapers + findings
    const [engRes, wpRes, findRes] = await Promise.all([
      sql`SELECT title as name, frameworks, period_start, period_end FROM engagements WHERE id = ${params.id}`,
      sql`SELECT control_id, implementation_status, test_result, residual_risk, exceptions_noted, signed_off_at FROM workpapers WHERE engagement_id = ${params.id}`,
      sql`SELECT title, severity, status FROM findings WHERE engagement_id = ${params.id}`,
    ])

    if (engRes.rows.length === 0) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const eng = engRes.rows[0] as any
    const wps = wpRes.rows as any[]
    const findings = findRes.rows as any[]

    if (wps.length === 0) {
      return NextResponse.json({ error: 'No workpapers to summarise' }, { status: 400 })
    }

    // Build compact workpaper summary for the prompt
    const wpSummary = wps.map(w => {
      const ctrl = controls.get(w.control_id)
      return `- ${w.control_id} (${ctrl?.clause_ref || '?'}): impl=${w.implementation_status || 'unknown'}, result=${w.test_result || 'not-tested'}, risk=${w.residual_risk || 'unknown'}${w.exceptions_noted ? ', EXCEPTIONS: ' + w.exceptions_noted.slice(0, 80) : ''}${w.signed_off_at ? ' [SIGNED]' : ''}`
    }).join('\n')

    const findSummary = findings.length > 0
      ? findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title} (${f.status})`).join('\n')
      : 'No findings raised.'

    const effective = wps.filter(w => w.test_result === 'effective').length
    const effectiveness = Math.round((effective / wps.length) * 100)

    const systemPrompt = `You are a senior audit partner writing an executive-level audit opinion and summary.
Write in formal but clear professional language suitable for a board audit committee.
Structure your response in these sections with markdown headers:
## Executive Summary
## Audit Opinion
## Key Findings (if any)
## Control Effectiveness by Domain
## Recommendations
## Conclusion

Keep the total response under 600 words. Be specific, not generic.`

    const userPrompt = `Prepare an executive audit summary for the following engagement:

ENGAGEMENT: ${eng.name}
FRAMEWORKS: ${Array.isArray(eng.frameworks) ? eng.frameworks.join(', ') : eng.frameworks}
PERIOD: ${eng.period_start || '—'} to ${eng.period_end || '—'}

CONTROL RESULTS (${wps.length} controls tested, ${effectiveness}% effective):
${wpSummary}

FINDINGS (${findings.length} total):
${findSummary}

Draft a formal executive audit summary and opinion. 
If effectiveness >= 80%, lean toward reasonable assurance.
If 60-79%, qualified opinion with specific concerns.
If <60%, adverse opinion requiring immediate attention.
Cite specific controls and articles where relevant.`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq error:', err)
      return NextResponse.json({ error: 'AI summary failed' }, { status: 500 })
    }

    const data = await response.json()
    const summary = (data.choices?.[0]?.message?.content || '').trim()

    // Save to ai_analyses table for audit trail
    try {
      await sql`
        INSERT INTO ai_analyses (
          engagement_id, control_id, mode, analysis, model, created_at
        ) VALUES (
          ${params.id}, 'ENGAGEMENT-SUMMARY', 'assurance',
          ${summary}, ${MODEL}, NOW()
        )
      `
    } catch (e: any) { console.warn('Save failed:', e.message) }

    return NextResponse.json({
      summary,
      model: MODEL,
      engagement: eng.name,
      effectiveness,
      controls_tested: wps.length,
      findings_total: findings.length,
      generated_by: actor.name,
      generated_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('AI summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
