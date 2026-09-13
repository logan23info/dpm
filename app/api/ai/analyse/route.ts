// app/api/ai/analyse/route.ts — with rate limiting
// Wraps the existing route with IP-based rate limiting
// Max 10 AI calls per IP per minute

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/ratelimit'
import controls from '@/lib/controls'
import { getActor } from '@/lib/session'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

function buildSystemPrompt(mode: 'advisory' | 'assurance'): string {
  if (mode === 'advisory') {
    return `You are a Data Protection Officer (DPO) and privacy compliance expert providing ADVISORY guidance.
Your role is to help organisations understand what they SHOULD DO to comply with the regulation.
Ground every recommendation in the authoritative regulatory text in the CONTROL LIBRARY CONTEXT.
Do not invent requirements. Only reference what appears in the library context.

Format with exactly:
## Test of Design (TOD)
**Objective** — **Key Questions** — **Recommendations** — **Red Flags**

## Test of Effectiveness (TOE)
**Objective** — **Key Questions** — **Recommendations** — **Red Flags**

## Test of Implementation (TOI)
**Objective** — **Key Questions** — **Evidence to Request** — **Red Flags**`
  }

  return `You are a senior IT Auditor providing formal ASSURANCE conclusions under IIA/ISA standards.
Ground every conclusion and test procedure in the library context. Be objective and evidence-based.
Use the library test procedures as your starting point.

Format with exactly:
## Test of Design (TOD)
**Audit Objective** — **Testing Procedure** — **Evidence Required** — **Possible Findings** — **Audit Conclusion**

## Test of Effectiveness (TOE)
**Audit Objective** — **Testing Procedure** — **Evidence Required** — **Possible Findings** — **Audit Conclusion**

## Test of Implementation (TOI)
**Audit Objective** — **Testing Procedure** — **Evidence Required** — **Possible Findings** — **Audit Conclusion**`
}

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req)
  const limit = rateLimit(ip)

  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil((limit.resetAt - Date.now()) / 1000)}s` },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  try {
    const actor = getActor(req)
    const body = await req.json()
    const { controlId, workpaperId, testResult, implementationStatus, exceptions, mode } = body

    if (!controlId || !mode) {
      return NextResponse.json({ error: 'controlId and mode are required' }, { status: 400 })
    }
    if (!['advisory', 'assurance'].includes(mode)) {
      return NextResponse.json({ error: "mode must be 'advisory' or 'assurance'" }, { status: 400 })
    }

    const apiKey = process.env.DPM_Key
    if (!apiKey) {
      return NextResponse.json({ error: 'AI features not configured: DPM_Key is not set' }, { status: 500 })
    }

    const control = controls.get(controlId)
    const controlContext = controls.buildAiContext(controlId)

    const userPrompt = `${controlContext}

CURRENT WORKPAPER ASSESSMENT
Implementation Status: ${implementationStatus || 'Not assessed'}
Test Result: ${testResult || 'Not tested'}
Exceptions Noted: ${exceptions || 'None noted'}

${mode === 'advisory'
  ? 'Provide advisory guidance for TOD, TOE, TOI. Focus on what the organisation should do.'
  : 'Provide formal assurance analysis for TOD, TOE, TOI. State clear provisional conclusions.'
}

Be specific to ${control?.clause_ref || controlId}. Cite EDPB guidelines where applicable.`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildSystemPrompt(mode as 'advisory' | 'assurance') },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Groq API error:', response.status, detail)
      return NextResponse.json({ error: `AI analysis failed (${response.status})` }, { status: 502 })
    }

    const data = await response.json()
    const analysis = (data.choices?.[0]?.message?.content || '').trim()

    // Persist
    let savedId: string | null = null
    try {
      const saved = await sql`
        INSERT INTO ai_analyses (workpaper_id, control_id, mode, analysis, model, created_at)
        VALUES (${workpaperId || null}, ${controlId}, ${mode}, ${analysis}, ${MODEL}, NOW())
        RETURNING id
      `
      savedId = saved.rows[0]?.id
    } catch (dbErr: any) {
      console.warn('Could not save ai_analysis:', dbErr.message)
    }

    return NextResponse.json(
      {
        id: savedId,
        analysis,
        control: control ? {
          id: control.id,
          clause_ref: control.clause_ref,
          domain: control.domain,
          framework: control.framework,
          control_objective: control.control_objective,
          inherent_risk: control.inherent_risk,
          key_control: control.key_control,
          evidence_required: control.evidence_required,
          sampling_basis: control.sampling_basis,
          cross_framework_refs: control.cross_framework_refs,
          authority_url: controls.getAuthorityUrl(controlId),
          authority_citation: controls.getAuthorityCitation(controlId),
        } : null,
        model: MODEL,
        mode,
        controlId,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(limit.remaining),
        },
      }
    )

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Disposition endpoint
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, disposition, modifiedText, auditorNote, dispositionedBy } = body

    if (!id || !disposition) {
      return NextResponse.json({ error: 'id and disposition are required' }, { status: 400 })
    }
    if (!['accepted', 'modified', 'rejected'].includes(disposition)) {
      return NextResponse.json({ error: "disposition must be 'accepted', 'modified', or 'rejected'" }, { status: 400 })
    }

    const result = await sql`
      UPDATE ai_analyses SET
        disposition      = ${disposition},
        modified_text    = ${modifiedText || null},
        auditor_note     = ${auditorNote || null},
        dispositioned_by = ${dispositionedBy || 'Unknown'},
        dispositioned_at = NOW()
      WHERE id = ${id}
      RETURNING id, disposition, dispositioned_by, dispositioned_at
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])

  } catch (error: any) {
    console.error('Disposition error:', error)
    return NextResponse.json({ error: 'Failed to record disposition' }, { status: 500 })
  }
}