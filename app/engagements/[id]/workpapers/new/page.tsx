'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import controls from '@/lib/controls'

const ALL_CONTROLS = controls.all()
const FRAMEWORKS   = controls.frameworks()

export default function NewWorkpaperPage() {
  const router = useRouter()
  const params = useParams()
  const engagementId = params.id as string

  const [selectedFramework, setSelectedFramework] = useState<string>('All')
  const [keyOnly, setKeyOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    control_id: '',
    implementation_status: '',
    test_result: '',
    residual_risk: '',
    conclusion: '',
    exceptions_noted: '',
  })

  // Filtered control list from library
  const filteredControls = ALL_CONTROLS.filter(c => {
    if (selectedFramework !== 'All' && c.framework !== selectedFramework) return false
    if (keyOnly && !c.key_control) return false
    return true
  })

  // Selected control metadata from library
  const selectedControl = controls.get(form.control_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.control_id) { setError('Control is required'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/workpapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagement_id: engagementId, ...form }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create workpaper')
        return
      }

      router.push(`/engagements/${engagementId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const RISK_COLORS: Record<string, string> = {
    High: 'bg-red-100 text-red-800',
    Medium: 'bg-amber-100 text-amber-800',
    Low: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/engagements/${engagementId}`}
              className="text-slate-500 hover:text-slate-700 text-sm"
            >
              ← Back to Engagement
            </Link>
            <h1 className="text-xl font-bold text-slate-900">New Workpaper</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Control selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Select Control</h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <select
                  value={selectedFramework}
                  onChange={e => { setSelectedFramework(e.target.value); setForm(p => ({...p, control_id: ''})) }}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="All">All frameworks</option>
                  {FRAMEWORKS.map(fw => (
                    <option key={fw} value={fw}>{fw}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keyOnly}
                    onChange={e => setKeyOnly(e.target.checked)}
                    className="rounded"
                  />
                  Key controls only
                </label>
              </div>

              {/* Control list */}
              <div className="space-y-1 max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredControls.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, control_id: c.id }))}
                    className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition border-b border-slate-100 last:border-0 ${
                      form.control_id === c.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.id}</p>
                        <p className="text-xs text-slate-500">{c.clause_ref}</p>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{c.control_objective}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RISK_COLORS[c.inherent_risk]}`}>
                          {c.inherent_risk}
                        </span>
                        {c.key_control && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            Key
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {filteredControls.length === 0 && (
                  <p className="text-center py-8 text-sm text-slate-400">No controls match filters</p>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-2">
                {filteredControls.length} controls · {controls.all().length} total in library
              </p>
            </div>

            {/* Selected control detail from library */}
            {selectedControl && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-blue-900">{selectedControl.id}</p>
                  <a
                    href={controls.getAuthorityUrl(selectedControl.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {selectedControl.clause_ref} →
                  </a>
                </div>
                <p className="text-blue-800 text-xs">{selectedControl.control_objective}</p>
                <div className="pt-2 border-t border-blue-200 space-y-1 text-xs text-blue-700">
                  <p><span className="font-medium">Domain:</span> {selectedControl.domain}</p>
                  <p><span className="font-medium">Frequency:</span> {selectedControl.frequency}</p>
                  <p><span className="font-medium">Evidence:</span> {selectedControl.evidence_required}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Assessment fields */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Initial Assessment</h2>
            <p className="text-xs text-slate-500">
              You can update these after fieldwork. Select a control first.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Implementation Status
              </label>
              <select
                value={form.implementation_status}
                onChange={e => setForm(p => ({ ...p, implementation_status: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="implemented">Implemented</option>
                <option value="partial">Partially Implemented</option>
                <option value="not-implemented">Not Implemented</option>
                <option value="not-applicable">Not Applicable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Test Result
              </label>
              <select
                value={form.test_result}
                onChange={e => setForm(p => ({ ...p, test_result: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="effective">Effective</option>
                <option value="partial">Partially Effective</option>
                <option value="ineffective">Ineffective</option>
                <option value="not-tested">Not Tested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Residual Risk
              </label>
              <select
                value={form.residual_risk}
                onChange={e => setForm(p => ({ ...p, residual_risk: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Exceptions Noted
              </label>
              <textarea
                value={form.exceptions_noted}
                onChange={e => setForm(p => ({ ...p, exceptions_noted: e.target.value }))}
                rows={3}
                placeholder={
                  selectedControl?.test_of_effectiveness
                    ? `Library guidance: ${selectedControl.test_of_effectiveness.slice(0, 80)}...`
                    : 'Describe any exceptions noted during testing...'
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conclusion
              </label>
              <textarea
                value={form.conclusion}
                onChange={e => setForm(p => ({ ...p, conclusion: e.target.value }))}
                rows={3}
                placeholder="Overall conclusion for this control..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Sampling guidance from library */}
            {selectedControl?.sampling_basis && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-700 mb-1">📊 Sampling Guidance (library)</p>
                <p>{selectedControl.sampling_basis}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !form.control_id}
                className="flex-1 bg-amber-500 text-white font-medium py-2.5 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {loading ? 'Creating...' : 'Create Workpaper'}
              </button>
              <Link
                href={`/engagements/${engagementId}`}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
