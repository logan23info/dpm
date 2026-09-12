// app/api/ai/analyse/route.ts
// TOD / TOE / TOI analysis — Advisory & Assurance modes
// Grounded in the control library (lib/controls.ts) — authoritative source



import { NextRequest, NextResponse } from 'next/server'
import controls from '@/lib/controls'
import { sql } from '@vercel/postgres'

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'


function buildSystemPrompt(mode: 'advisory' | 'assurance'): string {
  if (mode === 'advisory') {
    return `You are a Data Protection Officer (DPO) and privacy compliance expert providing ADVISORY guidance.

Your role is to help organisations understand what they SHOULD DO to comply with the regulation.
You must ground every recommendation in the authoritative regulatory text provided in the CONTROL LIBRARY CONTEXT block.
Do not invent requirements. If you cite an article or section, it must be from the library context.

Format your response with exactly these three sections:
## Test of Design (TOD)
**Objective** — what the design should achieve
**Key Questions** — 3-5 specific questions to assess adequacy of design
**Recommendations** — practical steps to improve or confirm the design
**Red Flags** — signs the design is inadequate

## Test of Effectiveness (TOE)
**Objective** — what effectiveness means for this control
**Key Questions** — 3-5 specific questions
**Recommendations** — how to demonstrate and improve effectiveness
**Red Flags** — signs the control is not operating as designed

## Test of Implementation (TOI)
**Objective** — what implemented means in practice
**Key Questions** — 3-5 specific questions for a walkthrough
**Evidence to Request** — specific documents, logs, or records (from library evidence_required)
**Red Flags** — signs the control exists on paper but not in practice`
  }

  return `You are a senior IT Auditor providing formal ASSURANCE conclusions under professional audit standards (IIA, ISA).

Your role is to provide independent, objective audit assessments of whether this control is designed, operating, and implemented effectively.
You must ground every conclusion and test procedure in the authoritative regulatory text provided in the CONTROL LIBRARY CONTEXT block.
Use the library's test procedures as your starting point — enhance them with context-specific guidance.
Be objective, evidence-based, and conclusive. Use formal audit language.
State whether sufficient appropriate evidence exists to support a conclusion.

Format your response with exactly these three sections:
## Test of Design (TOD)
**Audit Objective** — what adequacy of design means for this control
**Testing Procedure** — re-performable steps an auditor can execute (not restatements of the control)
**Evidence Required** — specific documents, logs, records (reference library evidence_required)
**Possible Findings** — deficiencies that may be noted
**Audit Conclusion** — provisional opinion on design adequacy

## Test of Effectiveness (TOE)
**Audit Objective** — what effective operation means
**Testing Procedure** — re-performable steps including sampling (reference library sampling_basis)
**Evidence Required** — what to inspect, agree, or re-perform
**Possible Findings** — exceptions and their implications
**Audit Conclusion** — provisional opinion on operating effectiveness

## Test of Implementation (TOI)
**Audit Objective** — what implementation means in practice
**Testing Procedure** — walkthrough steps, observation, enquiry
**Evidence Required** — system outputs, configurations, records
**Possible Findings** — implementation gaps
**Audit Conclusion** — provisional opinion on implementation`
}

function buildUserPrompt(
  controlContext: string,
  testResult: string,
  implementationStatus: string,
  exceptions: string,
  mode: 'advisory' | 'assurance'
): string {
  return `${controlContext}

CURRENT WORKPAPER ASSESSMENT
Implementation Status: ${implementationStatus || 'Not assessed'}
Test Result:          ${testResult || 'Not tested'}
Exceptions Noted:     ${exceptions || 'None noted'}

${mode === 'advisory'
  ? 'Provide advisory guidance for the TOD, TOE, and TOI. Focus on what the organisation should do to achieve and demonstrate compliance with the regulation referenced above.'
  : 'Provide formal assurance analysis for the TOD, TOE, and TOI. Assess whether this control provides reasonable assurance of compliance. State clear provisional conclusions for each test type. Use the library sampling basis to specify sample sizes.'
}

Important: your output will be reviewed and dispositioned by a qualified auditor before it informs any workpaper conclusion. Be thorough — the auditor will judge whether to accept, modify, or reject your analysis.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      controlId,
      workpaperId,
      testResult,
      implementationStatus,
      exceptions,
      mode,
      actorName,
    } = body

    if (!controlId || !mode) {
      return NextResponse.json(
        { error: 'controlId and mode are required' },
        { status: 400 }
      )
    }

    if (!['advisory', 'assurance'].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'advisory' or 'assurance'" },
        { status: 400 }
      )
    }

    const apiKey = process.env.DPM_Key
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features not configured: DPM_Key is not set' },
        { status: 500 }
      )
    }

    // Get control from library — this is the authoritative source
    const control = controls.get(controlId)
    const controlContext = controls.buildAiContext(controlId)

    // Call Groq
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
          {
            role: 'system',
            content: buildSystemPrompt(mode as 'advisory' | 'assurance'),
          },
          {
            role: 'user',
            content: buildUserPrompt(
              controlContext,
              testResult || '',
              implementationStatus || '',
              exceptions || '',
              mode as 'advisory' | 'assurance'
            ),
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Groq API error:', detail)
      return NextResponse.json(
        { error: `AI analysis failed: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const analysis = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()

    // Persist to ai_analyses table
    let savedId: string | null = null
    try {
      const saved = await sql`
        INSERT INTO ai_analyses (
          workpaper_id, control_id, mode, analysis, model, created_at
        ) VALUES (
          ${workpaperId || null},
          ${controlId},
          ${mode},
          ${analysis},
          ${MODEL},
          NOW()
        )
        RETURNING id
      `
      savedId = saved.rows[0]?.id
    } catch (dbErr: any) {
      // Non-fatal: AI still returns even if save fails
      console.warn('Could not save ai_analysis to DB:', dbErr.message)
    }

    return NextResponse.json({
      id: savedId,
      analysis,
      control: control
        ? {
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
          }
        : null,
      model: MODEL,
      mode,
      controlId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Disposition endpoint — record auditor's decision on an AI analysis
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, disposition, modifiedText, auditorNote, dispositionedBy } = body

    if (!id || !disposition) {
      return NextResponse.json(
        { error: 'id and disposition are required' },
        { status: 400 }
      )
    }

    if (!['accepted', 'modified', 'rejected'].includes(disposition)) {
      return NextResponse.json(
        { error: "disposition must be 'accepted', 'modified', or 'rejected'" },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE ai_analyses SET
        disposition       = ${disposition},
        modified_text     = ${modifiedText || null},
        auditor_note      = ${auditorNote || null},
        dispositioned_by  = ${dispositionedBy || 'Unknown'},
        dispositioned_at  = NOW()
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
