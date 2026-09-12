// lib/controls.ts
// Single source of truth for the control library.
// All 55 controls across 5 frameworks loaded from data/frameworks/*.json
// Everything in the app should read from here — never hardcode control IDs,
// names, articles, or framework mappings.

import gdprData from '@/data/frameworks/gdpr.json'
import dpdpData from '@/data/frameworks/dpdp-act.json'
import isoData from '@/data/frameworks/iso27701.json'
import nistData from '@/data/frameworks/nist-privacy.json'
import soc2Data from '@/data/frameworks/soc2-privacy.json'

// ── Authoritative source URLs ─────────────────────────────────────────────
export const AUTHORITY_URLS: Record<string, string> = {
  GDPR:     'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679',
  DPDP:     'https://www.meity.gov.in/sites/upload_files/dit/files/The%20Digital%20Personal%20Data%20Protection%20Act%2C%202023.pdf',
  ISO27701: 'https://www.iso.org/standard/71670.html',
  NISTPF:   'https://www.nist.gov/privacy-framework/privacy-framework',
  SOC2:     'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
}

export const AUTHORITY_NAMES: Record<string, string> = {
  GDPR:     'General Data Protection Regulation (EU) 2016/679 — EUR-Lex',
  DPDP:     'Digital Personal Data Protection Act 2023 — MeitY, India',
  ISO27701: 'ISO/IEC 27701:2019 — Privacy Information Management',
  NISTPF:   'NIST Privacy Framework v1.0',
  SOC2:     'AICPA Trust Services Criteria — Privacy',
}

// ── Control type ──────────────────────────────────────────────────────────
export interface Control {
  id: string
  clause_ref: string
  domain: string
  framework: string
  control_objective: string
  control_description: string
  risk_addressed: string
  inherent_risk: 'High' | 'Medium' | 'Low'
  key_control: boolean
  control_type: 'Preventive' | 'Detective' | 'Corrective'
  control_nature: 'Manual' | 'Automated' | 'IT-Dependent Manual'
  frequency: string
  test_of_design: string
  test_of_effectiveness: string
  population_basis: string
  sampling_basis: string
  evidence_required: string
  itgc_dependency: string[]
  cross_framework_refs: string[]
  owner: string
  // Workpaper state fields (populated from DB at runtime, not from JSON)
  status?: string
  test_result?: string
  residual_risk?: string | null
  exceptions_noted?: string | null
  conclusion?: string | null
}

// ── Load and index all controls ───────────────────────────────────────────
const ALL_CONTROLS: Control[] = [
  ...(gdprData as Control[]),
  ...(dpdpData as Control[]),
  ...(isoData as Control[]),
  ...(nistData as Control[]),
  ...(soc2Data as Control[]),
]

const INDEX = new Map<string, Control>(ALL_CONTROLS.map(c => [c.id, c]))

// ── Public API ────────────────────────────────────────────────────────────

/** All 55 controls */
export const all = (): Control[] => ALL_CONTROLS

/** Get a single control by ID (e.g. 'GDPR-Art32') */
export const get = (id: string): Control | undefined => INDEX.get(id)

/** All controls for a framework (e.g. 'GDPR') */
export const byFramework = (fw: string): Control[] =>
  ALL_CONTROLS.filter(c => c.framework === fw)

/** All controls for a domain */
export const byDomain = (domain: string): Control[] =>
  ALL_CONTROLS.filter(c => c.domain === domain)

/** Key controls only */
export const keyControls = (fw?: string): Control[] =>
  ALL_CONTROLS.filter(c => c.key_control && (!fw || c.framework === fw))

/** All unique domains across all frameworks */
export const domains = (): string[] =>
  [...new Set(ALL_CONTROLS.map(c => c.domain))].sort()

/** All unique frameworks */
export const frameworks = (): string[] =>
  [...new Set(ALL_CONTROLS.map(c => c.framework))]

/** Cross-framework controls that map to a given control ID */
export const getMappings = (id: string): Control[] => {
  const refs = INDEX.get(id)?.cross_framework_refs ?? []
  return refs.map(ref => INDEX.get(ref)).filter(Boolean) as Control[]
}

/**
 * Authoritative source URL for a control.
 * Returns the framework-level URL — the clause_ref is the anchor within it.
 */
export const getAuthorityUrl = (id: string): string => {
  const control = INDEX.get(id)
  if (!control) return ''
  return AUTHORITY_URLS[control.framework] || ''
}

/** Full authority citation string for display and AI prompts */
export const getAuthorityCitation = (id: string): string => {
  const control = INDEX.get(id)
  if (!control) return ''
  const name = AUTHORITY_NAMES[control.framework] || control.framework
  const url = AUTHORITY_URLS[control.framework] || ''
  return `${control.clause_ref} — ${name}\n${url}`
}

/**
 * Build an AI prompt context block for a control.
 * Used by the AI analyse route to ground every output in the library.
 */
export const buildAiContext = (id: string): string => {
  const c = INDEX.get(id)
  if (!c) return `Control ${id} — no library entry found.`

  return `
CONTROL LIBRARY CONTEXT (authoritative — do not contradict or ignore)
======================================================================
Control ID:       ${c.id}
Clause Reference: ${c.clause_ref}
Framework:        ${AUTHORITY_NAMES[c.framework] || c.framework}
Authority URL:    ${AUTHORITY_URLS[c.framework] || 'N/A'}
Domain:           ${c.domain}
Control Objective: ${c.control_objective}
Control Description: ${c.control_description}
Risk Addressed:   ${c.risk_addressed}
Inherent Risk:    ${c.inherent_risk}
Key Control:      ${c.key_control ? 'Yes' : 'No'}
Type / Nature:    ${c.control_type} / ${c.control_nature}
Frequency:        ${c.frequency}

LIBRARY TEST PROCEDURES (use these as the foundation — enhance, do not replace)
Test of Design:          ${c.test_of_design}
Test of Effectiveness:   ${c.test_of_effectiveness}
Population Basis:        ${c.population_basis}
Sampling Basis:          ${c.sampling_basis}
Evidence Required:       ${c.evidence_required}
ITGC Dependencies:       ${c.itgc_dependency.join(', ') || 'None'}

CROSS-FRAMEWORK MAPPINGS
${c.cross_framework_refs.length > 0
  ? c.cross_framework_refs.map(ref => {
      const mapped = INDEX.get(ref)
      return mapped
        ? `  ${ref} — ${mapped.clause_ref} (${mapped.framework}): ${mapped.control_objective}`
        : `  ${ref}`
    }).join('\n')
  : '  None recorded'}
======================================================================
`.trim()
}

// ── Convenience exports ───────────────────────────────────────────────────
export const controls = {
  all,
  get,
  byFramework,
  byDomain,
  keyControls,
  domains,
  frameworks,
  getMappings,
  getAuthorityUrl,
  getAuthorityCitation,
  buildAiContext,
}

export default controls
