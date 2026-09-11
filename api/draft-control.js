// POST /api/draft-control  { framework, text }  — same-origin only
import { guard, callClaude } from './_guard.js'

const SYSTEM = `You are a privacy and data protection audit SME drafting entries for a Risk Control Matrix.
Given a regulatory clause, produce ONE control record as strict JSON. Return ONLY the JSON object, no prose or code fences.

Schema:
{
  "id": string,                      // FRAMEWORK-Clause, e.g. "GDPR-Art32"
  "clause_ref": string,
  "domain": one of ["Governance & Accountability","Notice & Transparency","Consent & Lawful Basis","Data Subject Rights","Data Minimization & Retention","Security of Processing","Third-Party & Processor Management","Cross-Border Transfers","Incident & Breach Management","Privacy by Design & Assessment","Training & Awareness"],
  "control_objective": string,
  "control_description": string,
  "risk_addressed": string,
  "inherent_risk": "High"|"Medium"|"Low",
  "key_control": boolean,
  "control_type": "Preventive"|"Detective"|"Corrective",
  "control_nature": "Manual"|"Automated"|"IT-Dependent Manual",
  "frequency": "Continuous"|"Daily"|"Weekly"|"Monthly"|"Quarterly"|"Semi-Annual"|"Annual"|"Event-driven",
  "test_of_design": string,
  "test_of_effectiveness": string,
  "population_basis": string,        // what the population is and where it is extracted from
  "sampling_basis": string,          // sample size and method, justified by frequency and key_control
  "evidence_required": string,
  "itgc_dependency": string[],
  "owner": string
}

Rules: sampling must follow control frequency (annual 1-2, quarterly 2-8, monthly 3-15, continuous/event-driven 25).
Tests must be re-performable procedures an auditor can execute, not restatements of the control.`

export default async function handler(req, res) {
  const input = guard(req, res)
  if (!input) return

  try {
    const cleaned = await callClaude({
      system: SYSTEM,
      user: `Framework: ${input.framework}\n\nClause text:\n${input.text}`,
      maxTokens: 1500
    })
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(502).json({ error: 'Model did not return valid JSON.', raw: cleaned.slice(0, 800) })
    }
    parsed.framework = input.framework
    parsed.status = 'Not Started'
    parsed.test_result = 'Not Tested'
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
