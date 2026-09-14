'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface Processor {
  id: string
  name: string
  service_description: string | null
  country: string | null
  risk_tier: 'low' | 'medium' | 'high' | 'critical'
  dpa_status: 'pending' | 'signed' | 'expired' | 'not_required'
  dpa_signed_date: string | null
  dpa_expiry_date: string | null
  transfer_countries: string[]
  next_review_date: string | null
  status: 'active' | 'under_review' | 'terminated'
}

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-amber-100 text-amber-800 border-amber-200',
  low:      'bg-blue-100 text-blue-800 border-blue-200',
}

const DPA_CONFIG: Record<string, { label: string; color: string }> = {
  signed:       { label: 'DPA Signed',     color: 'text-green-700' },
  pending:      { label: 'DPA Pending',    color: 'text-amber-700' },
  expired:      { label: 'DPA Expired',    color: 'text-red-700' },
  not_required: { label: 'Not Required',   color: 'text-slate-500' },
}

export default function ProcessorRegisterPage() {
  const { actorHeaders } = useActor()
  const [processors, setProcessors] = useState<Processor[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', service_description: '', country: '',
    risk_tier: 'medium', dpa_status: 'pending',
    dpa_signed_date: '', dpa_expiry_date: '',
    transfer_countries: '', notes: '',
  })

  useEffect(() => { fetchProcessors() }, [])

  const fetchProcessors = async () => {
    try {
      const res = await fetch('/api/privacy/processors')
      if (res.ok) {
        const data = await res.json()
        setProcessors(data.processors)
        setSummary(data.summary)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        transfer_countries: form.transfer_countries.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/privacy/processors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify(payload),
      })
      if (res.ok) { fetchProcessors(); setShowForm(false) }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const updateDPA = async (id: string, dpa_status: string) => {
    await fetch('/api/privacy/processors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({
        id, dpa_status,
        dpa_signed_date: dpa_status === 'signed' ? new Date().toISOString().split('T')[0] : undefined,
      }),
    })
    fetchProcessors()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-500 hover:text-slate-700 text-sm">← Privacy Hub</Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Processor Register</h1>
                <p className="text-sm text-slate-500">GDPR Art. 28 · DPDP Sec 8.2 · DPA tracking</p>
              </div>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition">
              + Add Processor
            </button>
          </div>
        </div>
      </header>

      {summary && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-5 gap-4 text-center">
            {[
              { label: 'Total',        value: summary.total,      color: 'text-slate-900' },
              { label: 'High Risk',    value: summary.high,       color: 'text-red-600' },
              { label: 'DPA Pending',  value: summary.dpaPending, color: 'text-amber-600' },
              { label: 'DPA Expired',  value: summary.dpaExpired, color: 'text-red-700' },
              { label: 'Transfers',    value: summary.transfers,  color: 'text-blue-600' },
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
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-purple-300 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Add Processor / Vendor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Processor Name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Country</label>
                <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. Ireland, USA"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Service Description</label>
                <input value={form.service_description}
                  onChange={e => setForm(p => ({ ...p, service_description: e.target.value }))}
                  placeholder="e.g. Cloud hosting, Email marketing platform"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Risk Tier</label>
                <select value={form.risk_tier} onChange={e => setForm(p => ({ ...p, risk_tier: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">DPA Status</label>
                <select value={form.dpa_status} onChange={e => setForm(p => ({ ...p, dpa_status: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="pending">Pending</option>
                  <option value="signed">Signed</option>
                  <option value="expired">Expired</option>
                  <option value="not_required">Not Required</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">DPA Signed Date</label>
                <input type="date" value={form.dpa_signed_date}
                  onChange={e => setForm(p => ({ ...p, dpa_signed_date: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">DPA Expiry Date</label>
                <input type="date" value={form.dpa_expiry_date}
                  onChange={e => setForm(p => ({ ...p, dpa_expiry_date: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Transfer Countries (comma-separated)</label>
                <input value={form.transfer_countries}
                  onChange={e => setForm(p => ({ ...p, transfer_countries: e.target.value }))}
                  placeholder="USA, India (leave blank if EEA only)"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-purple-600 text-white font-medium py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
                  {saving ? 'Saving...' : 'Add Processor'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        ) : processors.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">🤝</p>
            <p className="text-slate-600 font-medium">No processors registered yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Processor', 'Country', 'Risk', 'DPA Status', 'Expiry', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processors.map(p => {
                  const dpa = DPA_CONFIG[p.dpa_status]
                  const isExpired = p.dpa_expiry_date && new Date(p.dpa_expiry_date) < new Date()
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        {p.service_description && (
                          <p className="text-xs text-slate-400 mt-0.5">{p.service_description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.country || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${RISK_COLORS[p.risk_tier]}`}>
                          {p.risk_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${dpa.color}`}>{dpa.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.dpa_expiry_date ? (
                          <span className={`text-xs ${isExpired ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                            {isExpired ? '⚠️ ' : ''}{new Date(p.dpa_expiry_date).toLocaleDateString('en-GB')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.dpa_status !== 'signed' && (
                          <button onClick={() => updateDPA(p.id, 'signed')}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            Mark DPA Signed
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
