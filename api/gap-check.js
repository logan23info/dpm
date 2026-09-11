// POST /api/gap-check  { framework, text }  — same-origin only
import { guard, callClaude } from './_guard.js'

const SYSTEM = `You are a privacy and data protection audit SME performing a control gap assessment.
Given a framework and the organization's existing policy or control text, identify material gaps.
Return ONLY strict JSON, no prose or code fences:

{
  "framework": string,
  "gaps": [
    {
      "area": string,
      "gap_description": string,
      "risk_if_unaddressed": string,
      "severity": "High"|"Medium"|"Low",
      "recommended_control": string,
      "suggested_test": string
    }
  ],
  "strengths_noted": string[],
  "scope_limitations": string
}

Report the 3-6 most material gaps ranked by severity, not an exhaustive checklist.
Use scope_limitations to state what could not be assessed from the text provided.`

export default async function handler(req, res) {
  const input = guard(req, res)
  if (!input) return

  try {
    const cleaned = await callClaude({
      system: SYSTEM,
      user: `Framework: ${input.framework}\n\nExisting policy/control text:\n${input.text}`,
      maxTokens: 2000
    })
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(502).json({ error: 'Model did not return valid JSON.', raw: cleaned.slice(0, 800) })
    }
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
