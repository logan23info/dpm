'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import controls from '@/lib/controls'
import { useActor } from '@/app/components/SessionBanner'

interface ScopeDecision {
  control_id: string
  clause_ref: string
  domain: string
  framework: string
  control_objective: string
  inherent_risk: 'High' | 'Medium' | 'Low'
  key_control: boolean
  in_scope: boolean | null
  risk_score: number | null
  scoping_rationale: string | null
  scoped_by: string | null
}

interface Summary {
  total: number
  inScope: number
  outOfScope: number
  unscoped: number
}

const RISK_COLORS = {
  High:   'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low:    'text-blue-700 bg-blue-50 border-blue-200',
}

export default function ScopingPage() {
  const params = useParams()
  const router = useRouter()
  const { actorHeaders } = useActor()
  const id = params.id as string

  const [decisions, setDecisions] = useState<ScopeDecision[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterFw, setFilterFw] = useState('All')
  const [filterScope, setFilterScope] = useState('All')
  const [rationales, setRationales] = useState<Record<string, string>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean | null>>({})

  const FRAMEWORKS = controls.frameworks()

  useEffect(() => { fetchScope() }, [id])

  const fetchScope = async () => {
    try {
      const res = await fetch(`/api/engagements/${id}/scope`)
      if (res.ok) {
        const data = await res.json()
        setDecisions(data.controls)
        setSummary(data.summary)
        const initRationales: Record<string, string> = {}
        data.controls.forEach((d: ScopeDecision) => {
          if (d.scoping_rationale) initRationales[d.control_id] = d.scoping_rationale
        })
        setRationales(initRationales)
      }
    } catch (e) { console.error(e) }finally { setLoading(false) }
  }

  const filtered = useMemo(() => decisions.filter(d => {
    if (filterFw !== 'All' && d.framework !== filterFw) return false
    if (filterScope === 'In Scope' && d.in_scope !== true) return false
    if (filterScope === 'Out of Scope' && d.in_scope !== false) return false
    if (filterScope === 'Unscoped' && d.in_scope !== null) return false
    return true
  }), [decisions, filterFw, filterScope])

  const setScope = (controlId: string, inScope: boolean | null) => {
    setPendingChanges(p => ({ ...p, [controlId]: inScope }))
    setDecisions(prev => prev.map(d =>
      d.control_id === controlId ? { ...d, in_scope: inScope } : d
    ))
  }

  const bulkScope = (inScope: boolean) => {
    const changes: Record<string, boolean> = {}
    filtered.forEach(d => { changes[d.control_id] = inScope })
    setPendingChanges(p => ({ ...p, ...changes }))
    setDecisions(prev => prev.map(d =>
      filtered.find(f => f.control_id === d.control_id)
        ? { ...d, in_scope: inScope }
        : d
    ))
  }

  const saveScope = async () => {
    if (Object.keys(pendingChanges).length === 0) return
    setSaving(true)
    try {
      const decisionsArray = Object.entries(pendingChanges).map(([control_id, in_scope]) => ({
        control_id,
        in_scope,
        scoping_rationale: rationales[control_id] || null,
      }))

      const res = await fetch(`/api/engagements/${id}/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ decisions: decisionsArray }),
      })

      if (res.ok) {
        setPendingChanges({})
        fetchScope()
      }
    } catch (e) { console.error(e) }finally { setSaving(false) }
  }

  const generatePBC = async () => {
    const res = await fetch(`/api/engagements/${id}/pbc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ autoGenerate: true }),
    })
    const data = await res.json()
    if (res.ok) {
      alert(`✅ Generated ${data.created} PBC items from in-scope controls`)
      router.push(`/engagements/${id}/pbc`)
    } else {
      alert(`❌ ${data.error}`)
    }
  }

  const inScopeCount = decisions.filter(d => d.in_scope === true).length
  const hasPending = Object.keys(pendingChanges).length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href={`/engagements/${id}`} className="text-slate-500 hover:text-slate-700 text-sm">
                ← Engagement
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Risk-Based Scoping</h1>
                <p className="text-sm text-slate-500">
                  Select which controls to test — document rationale for exclusions
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {inScopeCount > 0 && (
                <button
                  onClick={generatePBC}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                >
                  📋 Generate PBC ({inScopeCount} controls)
                </button>
              )}
              <button
                onClick={saveScope}
                disabled={!hasPending || saving}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : hasPending ? `Save (${Object.keys(pendingChanges).length} changes)` : 'Saved ✓'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary bar */}
      {summary && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-4 gap-6 text-center">
            {[
              { label: 'Total',       value: summary.total,       color: 'text-slate-900' },
              { label: 'In Scope',    value: summary.inScope,     color: 'text-green-600' },
              { label: 'Out of Scope',value: summary.outOfScope,  color: 'text-slate-400' },
              { label: 'Unscoped',    value: summary.unscoped,    color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters + bulk actions */}
        <div className="flex gap-3 mb-4 flex-wrap items-center">
          <select value={filterFw} onChange={e => setFilterFw(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="All">All frameworks</option>
            {FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
          </select>
          <select value={filterScope} onChange={e => setFilterScope(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="All">All scope status</option>
            <option value="In Scope">In Scope</option>
            <option value="Out of Scope">Out of Scope</option>
            <option value="Unscoped">Unscoped</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkScope(true)}
              className="px-3 py-2 bg-green-100 text-green-800 text-xs font-medium rounded-lg hover:bg-green-200 transition">
              ✅ Include all ({filtered.length})
            </button>
            <button onClick={() => bulkScope(false)}
              className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition">
              ❌ Exclude all ({filtered.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => {
              const cls1 = d.in_scope === true ? 'border-green-300' : d.in_scope === false ? 'border-slate-200 opacity-60' : 'border-amber-300'
              const cls2 = d.in_scope === true ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100'
              const cls3 = d.in_scope === false ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              const cls4 = d.in_scope === false && !rationales[d.control_id] ? 'border-red-300 bg-red-50' : 'border-slate-200'
              return (
              <div key={d.control_id}
                className={"bg-white rounded-lg border p-4 transition " + cls1}
              >
                <div className="flex items-start gap-4">
                  {/* Scope toggle */}
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    <button onClick={() => setScope(d.control_id, true)}
                      className={"w-8 h-8 rounded-lg text-sm font-bold transition " + cls2}>✓</button>
                    <button onClick={() => setScope(d.control_id, false)}
                      className={"w-8 h-8 rounded-lg text-sm font-bold transition " + cls3}>✕</button>
                  </div>

                  {/* Control info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-900 text-sm">{d.control_id}</span>
                      <span className="text-xs text-slate-400">{d.clause_ref}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${RISK_COLORS[d.inherent_risk]}`}>
                        {d.inherent_risk} risk
                      </span>
                      {d.key_control && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Key</span>
                      )}
                      <span className="text-xs text-slate-400">{d.domain}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{d.control_objective}</p>

                    {/* Rationale — required for out-of-scope */}
                    {(d.in_scope === false || d.in_scope === null) && (
                      <div>
                        <input
                          type="text"
                          value={rationales[d.control_id] || ''}
                          onChange={e => setRationales(p => ({ ...p, [d.control_id]: e.target.value }))}
                          placeholder={
                            d.in_scope === false
                              ? '⚠️ Rationale required for exclusion (e.g. "No transfers outside EEA in period")'
                              : 'Scoping rationale (optional)'
                          }
                          className={"w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 " + cls4}
                        />
                        {d.in_scope === false && !rationales[d.control_id] && (
                          <p className="text-xs text-red-600 mt-0.5">
                            Rationale required — regulators may ask why this control was not tested
                          </p>
                        )}
                      </div>
                    )}
                    {d.scoped_by && (
                      <p className="text-xs text-slate-400 mt-1">
                        Scoped by {d.scoped_by}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
            })}
          </div>
        )}
      </main>
    </div>
  )
}