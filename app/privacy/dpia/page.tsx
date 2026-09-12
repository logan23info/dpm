'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface DPIAEntry {
  id: string
  name: string
  processing_description: string
  necessity_justification: string | null
  risks: DPIARisk[]
  mitigations: string | null
  dpo_consulted: boolean
  dpo_advice: string | null
  residual_risk: 'low' | 'medium' | 'high'
  approved_by: string | null
  approved_at: string | null
  status: 'draft' | 'review' | 'approved' | 'rejected'
  created_at: string
}

interface DPIARisk {
  description: string
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  score: number
}

// DPIA screening questions (EDPB Guidelines on DPIA)
const SCREENING_QUESTIONS = [
  { id: 'q1', text: 'Does the processing involve systematic and extensive evaluation of personal aspects, including profiling?' },
  { id: 'q2', text: 'Does the processing involve large-scale processing of special category data (Art. 9) or criminal convictions (Art. 10)?' },
  { id: 'q3', text: 'Does the processing involve systematic monitoring of a publicly accessible area on a large scale?' },
  { id: 'q4', text: 'Is new technology being used that may create high risks?' },
  { id: 'q5', text: 'Does the processing prevent data subjects from exercising a right or using a service?' },
  { id: 'q6', text: 'Does the processing involve large-scale processing of personal data of children?' },
  { id: 'q7', text: 'Does the processing involve matching or combining data sets from different sources?' },
  { id: 'q8', text: 'Does the processing involve data concerning vulnerable persons?' },
  { id: 'q9', text: 'Is the processing carried out in innovative use or application of new technological or organisational solutions?' },
]

const RISK_MATRIX: Record<string, Record<string, number>> = {
  high:   { high: 9, medium: 6, low: 3 },
  medium: { high: 6, medium: 4, low: 2 },
  low:    { high: 3, medium: 2, low: 1 },
}

const RISK_COLOR = (score: number) =>
  score >= 6 ? 'bg-red-100 text-red-800 border-red-200'
  : score >= 4 ? 'bg-amber-100 text-amber-800 border-amber-200'
  : 'bg-green-100 text-green-800 border-green-200'

type WizardStep = 'screening' | 'description' | 'risks' | 'mitigations' | 'conclusion' | 'list'

export default function DPIAPage() {
  const { actorHeaders } = useActor()
  const [step, setStep] = useState<WizardStep>('list')
  const [entries, setEntries] = useState<DPIAEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Screening
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, boolean | null>>({})
  const [dpiaRequired, setDpiaRequired] = useState<boolean | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    processing_description: '',
    necessity_justification: '',
    mitigations: '',
    dpo_consulted: false,
    dpo_advice: '',
    residual_risk: 'medium' as 'low' | 'medium' | 'high',
  })
  const [risks, setRisks] = useState<DPIARisk[]>([])
  const [newRisk, setNewRisk] = useState({ description: '', likelihood: 'medium' as const, impact: 'medium' as const })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchDPIAs() }, [])

  const fetchDPIAs = async () => {
    // Local state only for now - API can be added
    setLoading(false)
  }

  const screeningRequired = () => {
    const yesCount = Object.values(screeningAnswers).filter(v => v === true).length
    return yesCount >= 2
  }

  const addRisk = () => {
    if (!newRisk.description.trim()) return
    const score = RISK_MATRIX[newRisk.likelihood][newRisk.impact]
    setRisks(p => [...p, { ...newRisk, score }])
    setNewRisk({ description: '', likelihood: 'medium', impact: 'medium' })
  }

  const maxRiskScore = risks.length > 0 ? Math.max(...risks.map(r => r.score)) : 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const entry: DPIAEntry = {
        id: crypto.randomUUID(),
        ...form,
        risks,
        approved_by: null,
        approved_at: null,
        status: 'draft',
        created_at: new Date().toISOString(),
      }
      setEntries(p => [entry, ...p])
      setStep('list')
      // Reset
      setForm({ name: '', processing_description: '', necessity_justification: '',
                mitigations: '', dpo_consulted: false, dpo_advice: '', residual_risk: 'medium' })
      setRisks([])
      setScreeningAnswers({})
      setDpiaRequired(null)
    } finally { setSaving(false) }
  }

  const STEPS: { key: WizardStep; label: string }[] = [
    { key: 'screening',   label: '1. Screening' },
    { key: 'description', label: '2. Description' },
    { key: 'risks',       label: '3. Risks' },
    { key: 'mitigations', label: '4. Mitigations' },
    { key: 'conclusion',  label: '5. Conclusion' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-500 hover:text-slate-700 text-sm">← Privacy Hub</Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">DPIA Wizard</h1>
                <p className="text-sm text-slate-500">GDPR Art. 35 · DPDP Sec 10.2 · EDPB Guidelines</p>
              </div>
            </div>
            {step === 'list' && (
              <button onClick={() => setStep('screening')}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">
                + New DPIA
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* DPIA List */}
        {step === 'list' && (
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-slate-600 font-medium mb-2">No DPIAs yet</p>
                <p className="text-sm text-slate-400 mb-4">
                  Required when processing is likely to result in high risk to individuals (GDPR Art. 35)
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-left max-w-md mx-auto">
                  <p className="font-semibold mb-2">DPIA is mandatory when you:</p>
                  <ul className="space-y-1 list-disc list-inside text-blue-700">
                    <li>Use systematic profiling or automated decisions</li>
                    <li>Process special category data at scale</li>
                    <li>Monitor publicly accessible areas</li>
                    <li>Use new technology creating high risks</li>
                  </ul>
                </div>
              </div>
            ) : (
              entries.map(e => (
                <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{e.name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{e.processing_description.slice(0, 80)}...</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        e.status === 'approved' ? 'bg-green-100 text-green-800'
                        : e.status === 'review' ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                      }`}>{e.status}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${RISK_COLOR(maxRiskScore)}`}>
                        {e.residual_risk} risk
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Wizard steps */}
        {step !== 'list' && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex gap-2">
              {STEPS.map(s => (
                <div key={s.key} className={`flex-1 text-center py-2 text-xs font-medium rounded-lg ${
                  step === s.key ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}>
                  {s.label}
                </div>
              ))}
            </div>

            {/* Step 1: Screening */}
            {step === 'screening' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-2">Screening Assessment</h2>
                <p className="text-sm text-slate-500 mb-5">
                  Based on EDPB Guidelines on DPIA — answer each question to determine if a DPIA is required.
                </p>
                <div className="space-y-4">
                  {SCREENING_QUESTIONS.map(q => (
                    <div key={q.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700 flex-1">{q.text}</p>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setScreeningAnswers(p => ({ ...p, [q.id]: true }))}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            screeningAnswers[q.id] === true
                              ? 'bg-red-500 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-red-50'
                          }`}>Yes</button>
                        <button onClick={() => setScreeningAnswers(p => ({ ...p, [q.id]: false }))}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            screeningAnswers[q.id] === false
                              ? 'bg-green-500 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-green-50'
                          }`}>No</button>
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(screeningAnswers).length > 0 && (
                  <div className={`mt-5 p-4 rounded-xl border-2 ${
                    screeningRequired()
                      ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'
                  }`}>
                    {screeningRequired() ? (
                      <>
                        <p className="font-bold text-red-900">⚠️ DPIA Required</p>
                        <p className="text-sm text-red-700 mt-1">
                          2 or more high-risk criteria identified. A DPIA must be conducted before processing begins.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-green-900">✅ DPIA Not Mandatory</p>
                        <p className="text-sm text-green-700 mt-1">
                          Fewer than 2 high-risk criteria identified. Consider documenting this assessment as evidence.
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button onClick={() => setStep('description')}
                    disabled={Object.keys(screeningAnswers).length < SCREENING_QUESTIONS.length}
                    className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                    {screeningRequired() ? 'Continue DPIA →' : 'Document Assessment →'}
                  </button>
                  <button onClick={() => setStep('list')}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Description */}
            {step === 'description' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Processing Description</h2>
                <div>
                  <label className="text-xs font-medium text-slate-600">DPIA Name / Processing Activity *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Customer profiling for personalised marketing"
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Description of Processing *</label>
                  <textarea required rows={4} value={form.processing_description}
                    onChange={e => setForm(p => ({ ...p, processing_description: e.target.value }))}
                    placeholder="Describe the nature, scope, context, and purposes of the processing..."
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Necessity & Proportionality Assessment</label>
                  <textarea rows={3} value={form.necessity_justification}
                    onChange={e => setForm(p => ({ ...p, necessity_justification: e.target.value }))}
                    placeholder="Why is this processing necessary? Could a less invasive approach achieve the same purpose?"
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('risks')} disabled={!form.name || !form.processing_description}
                    className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                    Next: Identify Risks →
                  </button>
                  <button onClick={() => setStep('screening')}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Risk Identification */}
            {step === 'risks' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Risk Identification</h2>
                <p className="text-sm text-slate-500">Identify risks to the rights and freedoms of data subjects.</p>

                {/* Add risk form */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                  <input value={newRisk.description}
                    onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe a specific risk (e.g. Unauthorised access to personal data)"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <div className="grid grid-cols-2 gap-3">
                    {(['likelihood', 'impact'] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs font-medium text-slate-600 capitalize">{field}</label>
                        <select value={newRisk[field]}
                          onChange={e => setNewRisk(p => ({ ...p, [field]: e.target.value as any }))}
                          className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Risk score: <strong>{RISK_MATRIX[newRisk.likelihood][newRisk.impact]}</strong>/9
                    </div>
                    <button onClick={addRisk} disabled={!newRisk.description.trim()}
                      className="px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                      + Add Risk
                    </button>
                  </div>
                </div>

                {/* Risk list */}
                {risks.length > 0 && (
                  <div className="space-y-2">
                    {risks.map((r, i) => (
                      <div key={i} className={`flex items-start justify-between p-3 rounded-lg border ${RISK_COLOR(r.score)}`}>
                        <div>
                          <p className="text-sm font-medium">{r.description}</p>
                          <p className="text-xs mt-0.5 opacity-70">
                            Likelihood: {r.likelihood} · Impact: {r.impact} · Score: {r.score}/9
                          </p>
                        </div>
                        <button onClick={() => setRisks(p => p.filter((_, j) => j !== i))}
                          className="text-xs opacity-50 hover:opacity-100 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep('mitigations')}
                    className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 transition">
                    Next: Mitigations ({risks.length} risks identified) →
                  </button>
                  <button onClick={() => setStep('description')}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Mitigations */}
            {step === 'mitigations' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Mitigation Measures</h2>
                <div>
                  <label className="text-xs font-medium text-slate-600">Proposed Mitigations</label>
                  <textarea rows={4} value={form.mitigations}
                    onChange={e => setForm(p => ({ ...p, mitigations: e.target.value }))}
                    placeholder="Describe the measures to mitigate identified risks..."
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="dpo" checked={form.dpo_consulted}
                    onChange={e => setForm(p => ({ ...p, dpo_consulted: e.target.checked }))} className="rounded" />
                  <label htmlFor="dpo" className="text-sm text-slate-700">DPO consulted (required when DPIA needed)</label>
                </div>
                {form.dpo_consulted && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">DPO Advice / Comments</label>
                    <textarea rows={2} value={form.dpo_advice}
                      onChange={e => setForm(p => ({ ...p, dpo_advice: e.target.value }))}
                      className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep('conclusion')}
                    className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 transition">
                    Next: Conclusion →
                  </button>
                  <button onClick={() => setStep('risks')}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Conclusion */}
            {step === 'conclusion' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Conclusion & Approval</h2>

                {/* Risk summary */}
                <div className={`p-4 rounded-xl border ${RISK_COLOR(maxRiskScore)}`}>
                  <p className="font-semibold">
                    Highest Risk Score: {maxRiskScore}/9 ({risks.length} risks identified)
                  </p>
                  <p className="text-sm mt-1">
                    {maxRiskScore >= 6 ? 'High residual risk — supervisory authority prior consultation may be required (Art. 36).'
                    : maxRiskScore >= 4 ? 'Medium residual risk — processing may proceed with mitigations in place.'
                    : 'Low residual risk — processing may proceed.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Overall Residual Risk</label>
                  <select value={form.residual_risk}
                    onChange={e => setForm(p => ({ ...p, residual_risk: e.target.value as any }))}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="low">Low — proceed</option>
                    <option value="medium">Medium — proceed with controls</option>
                    <option value="high">High — supervisory authority consultation required</option>
                  </select>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2 text-sm">
                  <p><span className="font-medium">Activity:</span> {form.name}</p>
                  <p><span className="font-medium">Risks identified:</span> {risks.length}</p>
                  <p><span className="font-medium">DPO consulted:</span> {form.dpo_consulted ? '✅ Yes' : '❌ No'}</p>
                  <p><span className="font-medium">Residual risk:</span> {form.residual_risk}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                    {saving ? 'Saving...' : '✅ Save DPIA'}
                  </button>
                  <button onClick={() => setStep('mitigations')}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
