'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface DPIA {
  id: string; name: string; processing_description: string
  residual_risk: 'low'|'medium'|'high'; dpo_consulted: boolean
  status: 'draft'|'review'|'approved'|'rejected'
  created_by: string; created_at: string; risks: any[]
}

const SCREENING = [
  'Systematic evaluation or profiling of personal aspects?',
  'Large-scale processing of special category data (Art. 9)?',
  'Systematic monitoring of publicly accessible area?',
  'New technology creating high risks?',
  'Processing that prevents exercise of rights?',
  'Large-scale processing of children data?',
  'Matching or combining datasets from different sources?',
  'Data concerning vulnerable persons?',
  'Innovative use of new technological or organisational solutions?',
]
const RISK_MATRIX: Record<string,Record<string,number>> = {
  high:{high:9,medium:6,low:3}, medium:{high:6,medium:4,low:2}, low:{high:3,medium:2,low:1},
}
const STATUS_COLORS: Record<string,string> = {
  draft:'bg-slate-100 text-slate-600', review:'bg-amber-100 text-amber-800',
  approved:'bg-green-100 text-green-800', rejected:'bg-red-100 text-red-800',
}

type Step = 'list'|'screening'|'description'|'risks'|'mitigations'|'conclusion'

export default function DPIAPage() {
  const { actorHeaders } = useActor()
  const [dpias, setDpias] = useState<DPIA[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('list')
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState<Record<number,boolean|null>>({})
  const [form, setForm] = useState({ name:'', processing_description:'', necessity_justification:'', mitigations:'', dpo_consulted:false, dpo_advice:'', residual_risk:'medium' as const })
  const [risks, setRisks] = useState<any[]>([])
  const [newRisk, setNewRisk] = useState({ description:'', likelihood:'medium', impact:'medium' })

  useEffect(() => { fetchDPIAs() }, [])

  const fetchDPIAs = async () => {
    try {
      const res = await fetch('/api/privacy/dpia')
      if (res.ok) { const d = await res.json(); setDpias(d.dpias); setSummary(d.summary) }
    } finally { setLoading(false) }
  }

  const allAnswered = () => Object.keys(answers).length >= SCREENING.length
  const screeningRequired = () => Object.values(answers).filter(v => v === true).length >= 2

  const addRisk = () => {
    if (!newRisk.description.trim()) return
    setRisks(p => [...p, { ...newRisk, score: RISK_MATRIX[newRisk.likelihood][newRisk.impact] }])
    setNewRisk({ description:'', likelihood:'medium', impact:'medium' })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/privacy/dpia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ ...form, risks, screening_answers: answers }),
      })
      if (res.ok) {
        fetchDPIAs(); setStep('list')
        setForm({ name:'', processing_description:'', necessity_justification:'', mitigations:'', dpo_consulted:false, dpo_advice:'', residual_risk:'medium' })
        setRisks([]); setAnswers({})
      }
    } finally { setSaving(false) }
  }

  const approve = async (id: string) => {
    await fetch('/api/privacy/dpia', { method:'PATCH', headers:{'Content-Type':'application/json',...actorHeaders}, body:JSON.stringify({id, action:'approve'}) })
    fetchDPIAs()
  }

  const STEPS: Step[] = ['screening','description','risks','mitigations','conclusion']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-700 text-sm">Privacy Hub</Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">DPIA Register</h1>
              <p className="text-sm text-slate-500">GDPR Art. 35 · Persisted assessments</p>
            </div>
          </div>
          {step === 'list' && (
            <button onClick={() => setStep('screening')} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">+ New DPIA</button>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">

        {step === 'list' && (
          <div className="space-y-4">
            {summary && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  {label:'Total',   value:summary.total,    color:'text-slate-900'},
                  {label:'Draft',   value:summary.draft,    color:'text-slate-600'},
                  {label:'Approved',value:summary.approved, color:'text-green-600'},
                  {label:'High Risk',value:summary.highRisk, color:'text-red-600'},
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
              </div>
            ) : dpias.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-slate-600 font-medium">No DPIAs yet</p>
              </div>
            ) : (
              dpias.map(d => (
                <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{d.name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{d.processing_description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                        <span className="text-xs text-slate-400">{d.risks?.length||0} risks · {d.created_by}</span>
                      </div>
                    </div>
                    {d.status === 'review' && (
                      <button onClick={() => approve(d.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition">Approve</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {step !== 'list' && (
          <div className="space-y-5">
            <div className="flex gap-1">
              {STEPS.map((s,i) => (
                <div key={s} className={`flex-1 h-1.5 rounded-full ${i<=stepIdx?'bg-amber-500':'bg-slate-200'}`} />
              ))}
            </div>

            {step === 'screening' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Step 1: Screening</h2>
                {SCREENING.map((q,i) => (
                  <div key={i} className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-700 flex-1">{q}</p>
                    <div className="flex gap-2 shrink-0">
                      {([true,false] as const).map(v => (
                        <button key={String(v)} onClick={() => setAnswers(p => ({...p,[i]:v}))}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${answers[i]===v?(v?'bg-red-500 text-white':'bg-green-500 text-white'):'bg-white border border-slate-300 text-slate-600'}`}>
                          {v?'Yes':'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {allAnswered() && (
                  <div className={`p-4 rounded-xl border-2 ${screeningRequired()?'border-red-400 bg-red-50':'border-green-400 bg-green-50'}`}>
                    <p className={`font-bold ${screeningRequired()?'text-red-900':'text-green-900'}`}>
                      {screeningRequired()?'⚠️ DPIA Required':'✅ DPIA Not Mandatory'}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep('description')} disabled={!allAnswered()} className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">Continue →</button>
                  <button onClick={() => setStep('list')} className="px-4 border border-slate-300 text-slate-700 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            {step === 'description' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Step 2: Description</h2>
                <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required placeholder="Activity name *"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <textarea rows={3} value={form.processing_description} onChange={e => setForm(p=>({...p,processing_description:e.target.value}))} placeholder="Processing description *"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <textarea rows={2} value={form.necessity_justification} onChange={e => setForm(p=>({...p,necessity_justification:e.target.value}))} placeholder="Necessity & proportionality justification"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <div className="flex gap-3">
                  <button onClick={() => setStep('risks')} disabled={!form.name||!form.processing_description} className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">Next: Risks →</button>
                  <button onClick={() => setStep('screening')} className="px-4 border border-slate-300 text-slate-700 rounded-lg text-sm">Back</button>
                </div>
              </div>
            )}

            {step === 'risks' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Step 3: Risks</h2>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <input value={newRisk.description} onChange={e => setNewRisk(p=>({...p,description:e.target.value}))} placeholder="Describe a risk to data subjects..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <div className="flex gap-3">
                    {(['likelihood','impact'] as const).map(f => (
                      <select key={f} value={newRisk[f]} onChange={e => setNewRisk(p=>({...p,[f]:e.target.value}))}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm capitalize">
                        {['low','medium','high'].map(v => <option key={v} value={v}>{f}: {v}</option>)}
                      </select>
                    ))}
                    <button onClick={addRisk} disabled={!newRisk.description.trim()} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">+ Add</button>
                  </div>
                </div>
                {risks.map((r,i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${r.score>=6?'bg-red-50 border-red-200':r.score>=4?'bg-amber-50 border-amber-200':'bg-green-50 border-green-200'}`}>
                    <div>
                      <p className="text-sm text-slate-800">{r.description}</p>
                      <p className="text-xs text-slate-500">{r.likelihood} · {r.impact} · score {r.score}/9</p>
                    </div>
                    <button onClick={() => setRisks(p=>p.filter((_,j)=>j!==i))} className="text-slate-400 hover:text-red-500 ml-3">✕</button>
                  </div>
                ))}
                <div className="flex gap-3">
                  <button onClick={() => setStep('mitigations')} className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 transition">Next: Mitigations →</button>
                  <button onClick={() => setStep('description')} className="px-4 border border-slate-300 text-slate-700 rounded-lg text-sm">Back</button>
                </div>
              </div>
            )}

            {step === 'mitigations' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Step 4: Mitigations</h2>
                <textarea rows={4} value={form.mitigations} onChange={e => setForm(p=>({...p,mitigations:e.target.value}))} placeholder="Describe measures to reduce risks..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={form.dpo_consulted} onChange={e => setForm(p=>({...p,dpo_consulted:e.target.checked}))} className="rounded" />
                  <span className="text-sm text-slate-700">DPO consulted</span>
                </label>
                {form.dpo_consulted && (
                  <textarea rows={2} value={form.dpo_advice} onChange={e => setForm(p=>({...p,dpo_advice:e.target.value}))} placeholder="DPO advice..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep('conclusion')} className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 transition">Next: Conclusion →</button>
                  <button onClick={() => setStep('risks')} className="px-4 border border-slate-300 text-slate-700 rounded-lg text-sm">Back</button>
                </div>
              </div>
            )}

            {step === 'conclusion' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Step 5: Conclusion</h2>
                <select value={form.residual_risk} onChange={e => setForm(p=>({...p,residual_risk:e.target.value as any}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="low">Low — proceed</option>
                  <option value="medium">Medium — proceed with controls</option>
                  <option value="high">High — supervisory authority consultation required (Art. 36)</option>
                </select>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-1">
                  <p><span className="font-medium">Activity:</span> {form.name}</p>
                  <p><span className="font-medium">Risks:</span> {risks.length}</p>
                  <p><span className="font-medium">DPO consulted:</span> {form.dpo_consulted?'Yes':'No'}</p>
                  <p><span className="font-medium">Residual risk:</span> {form.residual_risk}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                    {saving?'Saving...':'✅ Save DPIA'}
                  </button>
                  <button onClick={() => setStep('mitigations')} className="px-4 border border-slate-300 text-slate-700 rounded-lg text-sm">Back</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
