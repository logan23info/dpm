'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface RoPA {
  id: string
  name: string
  department: string | null
  purpose: string
  lawful_basis: string
  data_categories: string[]
  data_subjects: string[]
  recipients: string[]
  third_country_transfers: boolean
  transfer_mechanism: string | null
  retention_period: string | null
  dpia_required: boolean
  dpia_completed: boolean
  status: 'active' | 'under_review' | 'archived'
  last_reviewed: string | null
}

const BASIS_LABELS: Record<string, string> = {
  consent: 'Consent (Art. 6(1)(a))',
  contract: 'Contract (Art. 6(1)(b))',
  legal_obligation: 'Legal Obligation (Art. 6(1)(c))',
  vital_interests: 'Vital Interests (Art. 6(1)(d))',
  public_task: 'Public Task (Art. 6(1)(e))',
  legitimate_interests: 'Legitimate Interests (Art. 6(1)(f))',
}

const STATUS_COLORS = {
  active:       'bg-green-100 text-green-800',
  under_review: 'bg-amber-100 text-amber-800',
  archived:     'bg-slate-100 text-slate-500',
}

const BLANK = {
  name: '', department: '', purpose: '', lawful_basis: 'legitimate_interests',
  data_categories: '', data_subjects: '', recipients: '',
  third_country_transfers: false, transfer_mechanism: '',
  retention_period: '', dpia_required: false,
}

export default function RoPAPage() {
  const { actorHeaders } = useActor()
  const [entries, setEntries] = useState<RoPA[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { fetchRoPA() }, [])

  const fetchRoPA = async () => {
    try {
      const res = await fetch('/api/privacy/ropa')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
        setSummary(data.summary)
      }
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        data_categories: form.data_categories.split(',').map(s => s.trim()).filter(Boolean),
        data_subjects:   form.data_subjects.split(',').map(s => s.trim()).filter(Boolean),
        recipients:      form.recipients.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/privacy/ropa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        fetchRoPA()
        setShowForm(false)
        setForm(BLANK)
      }
    } finally { setSaving(false) }
  }

  const markReviewed = async (id: string) => {
    await fetch('/api/privacy/ropa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ id, status: 'active' }),
    })
    fetchRoPA()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-500 hover:text-slate-700 text-sm">← Privacy Hub</Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Record of Processing Activities</h1>
                <p className="text-sm text-slate-500">GDPR Art. 30 · DPDP Sec 8.7</p>
              </div>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              + Add Activity
            </button>
          </div>
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Total Activities', value: summary.total,        color: 'text-slate-900' },
              { label: 'Active',           value: summary.active,       color: 'text-green-600' },
              { label: 'DPIA Required',    value: summary.dpiaRequired, color: 'text-amber-600' },
              { label: 'Cross-Border',     value: summary.transfers,    color: 'text-blue-600'  },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-300 p-6">
            <h2 className="font-bold text-slate-900 mb-4">New Processing Activity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Activity Name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Customer Onboarding"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Department</label>
                <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Purpose *</label>
                <textarea required rows={2} value={form.purpose}
                  onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Lawful Basis *</label>
                <select required value={form.lawful_basis}
                  onChange={e => setForm(p => ({ ...p, lawful_basis: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(BASIS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Retention Period</label>
                <input value={form.retention_period}
                  onChange={e => setForm(p => ({ ...p, retention_period: e.target.value }))}
                  placeholder="e.g. 7 years after contract end"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Data Categories (comma-separated)</label>
                <input value={form.data_categories}
                  onChange={e => setForm(p => ({ ...p, data_categories: e.target.value }))}
                  placeholder="Name, Email, Financial data"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Data Subjects (comma-separated)</label>
                <input value={form.data_subjects}
                  onChange={e => setForm(p => ({ ...p, data_subjects: e.target.value }))}
                  placeholder="Customers, Employees"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="dpia" checked={form.dpia_required}
                  onChange={e => setForm(p => ({ ...p, dpia_required: e.target.checked }))} className="rounded" />
                <label htmlFor="dpia" className="text-sm text-slate-700">DPIA required (Art. 35)</label>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" id="transfer" checked={form.third_country_transfers}
                  onChange={e => setForm(p => ({ ...p, third_country_transfers: e.target.checked }))} className="rounded" />
                <label htmlFor="transfer" className="text-sm text-slate-700">Third country transfers</label>
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {saving ? 'Saving...' : 'Add to RoPA'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* RoPA entries */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-slate-600 font-medium">No processing activities yet</p>
            <p className="text-sm text-slate-400 mt-1">Add your first activity to start building the RoPA</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{entry.name}</h3>
                      {entry.department && (
                        <span className="text-xs text-slate-400">· {entry.department}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[entry.status]}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                      {entry.dpia_required && !entry.dpia_completed && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                          DPIA needed
                        </span>
                      )}
                      {entry.third_country_transfers && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          Transfer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{entry.purpose}</p>
                  </div>
                  <span className="text-slate-400 text-sm">{expanded === entry.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === entry.id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Lawful Basis</p>
                      <p className="text-slate-800">{BASIS_LABELS[entry.lawful_basis] || entry.lawful_basis}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Retention</p>
                      <p className="text-slate-800">{entry.retention_period || '—'}</p>
                    </div>
                    {entry.data_categories?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Data Categories</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.data_categories.map((c, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.data_subjects?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Data Subjects</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.data_subjects.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => markReviewed(entry.id)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition">
                      ✓ Mark Reviewed
                    </button>
                    {entry.last_reviewed && (
                      <span className="text-xs text-slate-400 self-center">
                        Last reviewed: {new Date(entry.last_reviewed).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
