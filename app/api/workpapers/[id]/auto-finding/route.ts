// app/api/workpapers/[id]/auto-finding/route.ts
// Auto-draft a finding from a failed/ineffective workpaper using Groq
// Auditor must review, edit, and confirm before it is saved

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'
import controls from '@/lib/controls'

export const dynamic = 'force-dynamic'

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

    // Get workpaper
    const wpResult = await sql`SELECT * FROM workpapers WHERE id = ${params.id}`
    if (wpResult.rows.length === 0) {
      return NextResponse.json({ error: 'Workpaper not found' }, { status: 404 })
    }
    const wp = wpResult.rows[0] as any

    // Only draft findings for non-effective controls
    if (wp.test_result === 'effective') {
      return NextResponse.json({
        error: 'Auto-draft only available for ineffective or partially effective controls'
      }, { status: 400 })
    }

    const ctrl = controls.get(wp.control_id)
    const authority = ctrl ? controls.getAuthorityCitation(wp.control_id) : ''

    const systemPrompt = `You are a senior IT Auditor drafting an audit finding in formal audit language.
Structure your response as valid JSON with exactly these fields:
{
  "title": "Short, specific finding title (max 80 chars)",
  "condition": "What was found during testing — the factual observation",
  "criteria": "The standard or requirement the control should meet (cite the regulatory article)",
  "cause": "Root cause of the deficiency",
  "effect": "Potential or actual impact on data subjects and the organisation",
  "recommendation": "Specific, actionable remediation steps"
}

Return ONLY valid JSON. No preamble, no markdown, no explanation.`

    const userPrompt = `Draft an audit finding for this control assessment:

Control: ${wp.control_id}
${ctrl ? `Clause: ${ctrl.clause_ref} — ${ctrl.control_objective}` : ''}
${authority ? `Authority: ${authority}` : ''}

Assessment Results:
- Implementation Status: ${wp.implementation_status || 'Not documented'}
- Test Result: ${wp.test_result || 'Not tested'}
- Residual Risk: ${wp.residual_risk || 'Not assessed'}
- Exceptions Noted: ${wp.exceptions_noted || 'None documented'}
- Conclusion: ${wp.conclusion || 'None'}

Draft a formal audit finding using the condition/criteria/cause/effect/recommendation structure.
The criteria must cite the specific regulatory article (${ctrl?.clause_ref || 'the applicable regulation'}).
Be specific and evidence-based. This draft will be reviewed and edited by a qualified auditor before use.`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq error:', err)
      return NextResponse.json({ error: 'AI draft failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content || '').trim()

    // Parse JSON response
    let draft: any
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      draft = JSON.parse(clean)
    } catch (e) {
      // Return raw if JSON parse fails
      draft = { title: 'Draft finding', condition: raw }
    }

    // Build description from structured fields
    const description = [
      draft.condition && `Condition: ${draft.condition}`,
      draft.criteria && `Criteria: ${draft.criteria}`,
      draft.cause && `Cause: ${draft.cause}`,
      draft.effect && `Effect: ${draft.effect}`,
    ].filter(Boolean).join('\n\n')

    return NextResponse.json({
      draft: {
        title: draft.title || `Gap: ${wp.control_id}`,
        description,
        recommendation: draft.recommendation || '',
        severity: wp.residual_risk === 'critical' ? 'critical'
          : wp.residual_risk === 'high' ? 'high'
          : wp.test_result === 'ineffective' ? 'high' : 'medium',
        control_id: wp.control_id,
        engagement_id: wp.engagement_id,
        workpaper_id: wp.id,
      },
      structured: draft,
      model: MODEL,
      origin: 'ai_assisted',
      drafted_by: actor.name,
    })

  } catch (error) {
    console.error('Auto-finding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}