'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import controls from '@/lib/controls'
import type { Control } from '@/lib/controls'

const ALL = controls.all()
const FRAMEWORKS = controls.frameworks()
const DOMAINS = controls.domains()

const RISK_COLORS: Record<string, string> = {
  High:   'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low:    'bg-blue-100 text-blue-800 border-blue-200',
}

const FW_COLORS: Record<string, string> = {
  GDPR:     'bg-blue-100 text-blue-800',
  DPDP:     'bg-green-100 text-green-800',
  ISO27701: 'bg-purple-100 text-purple-800',
  NISTPF:   'bg-amber-100 text-amber-800',
  SOC2:     'bg-slate-100 text-slate-700',
}

type AIMode = 'gap' | 'draft'

function Field({ label, value }: { label: string; value?: string | boolean }) {
  if (!value && value !== false) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-700">{String(value)}</p>
    </div>
  )
}

function CrossRefs({ refs }: { refs: string[] }) {
  if (!refs?.length) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cross-Framework Mappings</p>
      <div className="flex flex-wrap gap-1">
        {refs.map(ref => {
          const ctrl = controls.get(ref)
          return (
            <span key={ref} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full" title={ctrl?.control_objective}>
              {ref}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function ControlsPage() {
  const [selectedFws, setSelectedFws] = useState<string[]>(FRAMEWORKS)
  const [domain, setDomain] = useState('All')
  const [risk, setRisk] = useState('All')
  const [keyOnly, setKeyOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // AI drawer
  const [aiMode, setAiMode] = useState<AIMode>('gap')
  const [aiFramework, setAiFramework] = useState('GDPR')
  const [aiText, setAiText] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAI, setShowAI] = useState(false)

  const filtered = useMemo(() => {
    return ALL.filter(c => {
      if (!selectedFws.includes(c.framework)) return false
      if (domain !== 'All' && c.domain !== domain) return false
      if (risk !== 'All' && c.inherent_risk !== risk) return false
      if (keyOnly && !c.key_control) return false
      if (search) {
        const q = search.toLowerCase()
        return c.id.toLowerCase().includes(q) ||
          c.control_objective.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q) ||
          c.clause_ref.toLowerCase().includes(q)
      }
      return true
    })
  }, [selectedFws, domain, risk, keyOnly, search])

  const runAI = async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiResult('')
    try {
      const endpoint = aiMode === 'gap' ? '/api/gap-check' : '/api/draft-control'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: aiFramework, text: aiText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Status ${res.status}`)
      setAiResult(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">← Dashboard</Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Control Library</h1>
                <p className="text-sm text-slate-500">
                  {filtered.length} of {ALL.length} controls · 5 frameworks · authoritative sources
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${showAI ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
            >
              🤖 AI Assistant
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-3 flex-wrap items-center">
          {/* Framework multi-select */}
          <div className="flex gap-1">
            {FRAMEWORKS.map(fw => {
              const cls = selectedFws.includes(fw) ? (FW_COLORS[fw] || 'bg-slate-100 text-slate-700') + ' border-transparent' : 'bg-white border-slate-300 text-slate-400'
              return (
                <button key={fw} onClick={() => {
                  setSelectedFws(prev =>
                    prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]
                  )
                }}
                  className={"text-xs px-2 py-1 rounded-full border font-medium transition " + cls}
                >
                  {fw}
                </button>
              )
            })}
          </div>

          <select value={domain} onChange={e => setDomain(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="All">All domains</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={risk} onChange={e => setRisk(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="All">All risk</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={keyOnly} onChange={e => setKeyOnly(e.target.checked)} className="rounded" />
            Key only
          </label>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search controls..."
            className="border border-slate-300 rounded-lg px-3 py-1 text-xs flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">

        {/* Control table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Control ID', 'Framework', 'Domain', 'Objective', 'Risk', 'Key', 'Freq'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="border-b border-slate-100 hover:bg-amber-50 cursor-pointer transition"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-xs font-bold text-slate-900">{c.id}</p>
                        <p className="text-xs text-slate-400">{c.clause_ref}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${FW_COLORS[c.framework] || 'bg-slate-100 text-slate-700'}`}>
                          {c.framework}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{c.domain}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 max-w-xs">
                        <span className="line-clamp-2">{c.control_objective}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${RISK_COLORS[c.inherent_risk]}`}>
                          {c.inherent_risk}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.key_control && <span className="text-amber-500 font-bold text-sm">★</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{c.frequency}</td>
                    </tr>

                    {expanded === c.id && (
                      <tr key={`${c.id}-detail`} className="border-b border-amber-200 bg-amber-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <Field label="Control Description" value={c.control_description} />
                              <Field label="Risk Addressed" value={c.risk_addressed} />
                              <Field label="Control Type" value={`${c.control_type} / ${c.control_nature}`} />
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Authoritative Source</p>
                                <a href={controls.getAuthorityUrl(c.id)} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline">
                                  {c.framework} →
                                </a>
                              </div>
                            </div>
                            <div>
                              <Field label="Test of Design" value={c.test_of_design} />
                              <Field label="Test of Effectiveness" value={c.test_of_effectiveness} />
                            </div>
                            <div>
                              <Field label="Population Basis" value={c.population_basis} />
                              <Field label="Sampling Basis" value={c.sampling_basis} />
                              <Field label="Evidence Required" value={c.evidence_required} />
                              <Field label="ITGC Dependencies" value={c.itgc_dependency?.join(', ')} />
                              <CrossRefs refs={c.cross_framework_refs} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No controls match filters</div>
            )}
          </div>
        </div>

        {/* AI Drawer */}
        {showAI && (
          <div className="w-96 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-40">
              <h3 className="font-bold text-slate-900 mb-3">🤖 AI Control Assistant</h3>

              <div className="flex gap-2 mb-3">
                {(['gap', 'draft'] as AIMode[]).map(m => {
                  const cls = aiMode === m ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  return (
                    <button key={m} onClick={() => setAiMode(m)}
                      className={"flex-1 py-1.5 text-xs font-medium rounded-lg transition capitalize " + cls}>
                      {m === 'gap' ? '🔍 Gap Check' : '📝 Draft Control'}
                    </button>
                  )
                })}
              </div>

              <select value={aiFramework} onChange={e => setAiFramework(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500">
                {FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
              </select>

              <textarea
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                rows={5}
                placeholder={aiMode === 'gap'
                  ? 'Paste a policy or procedure — AI will identify gaps against the selected framework...'
                  : 'Paste a regulatory clause or description — AI will draft a control in RCM format...'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <button onClick={runAI} disabled={aiLoading || !aiText.trim()}
                className="w-full bg-amber-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                {aiLoading ? 'Running...' : aiMode === 'gap' ? '🔍 Check for Gaps' : '📝 Draft Control'}
              </button>

              {aiError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Result:</p>
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap">
                    {aiResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}