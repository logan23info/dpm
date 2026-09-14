'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface Breach {
  id: string
  ref: string
  title: string
  discovered_at: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'contained' | 'notified' | 'closed'
  sa_notification_required: boolean
  sa_notified_at: string | null
  estimated_individuals: number | null
  timeline: BreachTimeline | null
}

interface Summary {
  total: number
  open: number
  overdue: number
  urgent: number
  notified: number
}

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-amber-100 text-amber-800 border-amber-200',
  low:      'bg-blue-100 text-blue-800 border-blue-200',
}

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-red-100 text-red-800',
  contained: 'bg-amber-100 text-amber-800',
  notified:  'bg-blue-100 text-blue-800',
  closed:    'bg-green-100 text-green-800',
}

type BreachTimeline = { deadline72h: string; hoursRemaining: number; isOverdue: boolean; isUrgent: boolean }

function Clock72h({ timeline }: { timeline: BreachTimeline }) {
  const pct    = Math.max(0, Math.min(100, (timeline.hoursRemaining / 72) * 100))
  const bar    = timeline.isOverdue ? 'bg-red-500' : timeline.isUrgent ? 'bg-orange-500' : 'bg-green-500'
  const border = timeline.isOverdue ? 'border-red-300 bg-red-50' : timeline.isUrgent ? 'border-orange-300 bg-orange-50' : 'border-blue-200 bg-blue-50'
  const txt    = timeline.isOverdue ? 'text-red-700' : timeline.isUrgent ? 'text-orange-700' : 'text-blue-700'
  const label  = timeline.isOverdue ? (Math.abs(timeline.hoursRemaining) + 'h OVERDUE') : (timeline.hoursRemaining + 'h remaining')
  return (
    <div className={"rounded-lg border p-3 " + border}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600">72h SA Notification</span>
        <span className={"text-xs font-bold " + txt}>{label}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className={"h-2 rounded-full transition-all " + bar} style={{ width: pct + "%" }} />
      </div>
      <p className="text-xs text-slate-500 mt-1">Deadline: {new Date(timeline.deadline72h).toLocaleString('en-GB')}</p>
    </div>
  )
}


export default function BreachRegisterPage() {
  const { actorHeaders } = useActor()
  const [breaches, setBreaches] = useState<Breach[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    discovered_at: new Date().toISOString().slice(0, 16),
    description: '',
    severity: 'medium',
    estimated_individuals: '',
    sa_notification_required: false,
    likely_harm: '',
  })

  useEffect(() => { fetchBreaches() }, [])

  const fetchBreaches = async () => {
    try {
      const res = await fetch('/api/privacy/breach')
      if (res.ok) {
        const data = await res.json()
        setBreaches(data.breaches)
        setSummary(data.summary)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/privacy/breach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({
          ...form,
          estimated_individuals: form.estimated_individuals
            ? parseInt(form.estimated_individuals) : null,
        }),
      })
      if (res.ok) {
        const breach = await res.json()
        setBreaches(p => [breach, ...p])
        setShowForm(false)
        setForm({
          title: '', discovered_at: new Date().toISOString().slice(0, 16),
          description: '', severity: 'medium', estimated_individuals: '',
          sa_notification_required: false, likely_harm: '',
        })
        fetchBreaches()
      }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const notifySA = async (id: string) => {
    const ref = prompt('SA reference number (optional):')
    await fetch('/api/privacy/breach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ id, action: 'notify_sa', sa_reference: ref }),
    })
    fetchBreaches()
  }

  const closeBreach = async (id: string) => {
    const root_cause = prompt('Root cause:')
    const remediation = prompt('Remediation taken:')
    await fetch('/api/privacy/breach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ id, action: 'close', root_cause, remediation }),
    })
    fetchBreaches()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-500 hover:text-slate-700 text-sm">
                ← Privacy Hub
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Breach Register</h1>
                <p className="text-sm text-slate-500">GDPR Art. 33/34 · DPDP Sec 8.6</p>
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition">
              🚨 Log Breach
            </button>
          </div>
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-5 gap-4 text-center">
            {[
              { label: 'Total',    value: summary.total,    color: 'text-slate-900' },
              { label: 'Open',     value: summary.open,     color: 'text-red-600' },
              { label: 'Overdue',  value: summary.overdue,  color: 'text-red-700 font-bold' },
              { label: 'Urgent',   value: summary.urgent,   color: 'text-orange-600' },
              { label: 'Notified', value: summary.notified, color: 'text-green-600' },
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

        {/* Log breach form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-red-300 p-6">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              🚨 Log New Breach
              <span className="text-xs font-normal text-red-600">
                72h clock starts from discovery time
              </span>
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Title *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Brief description of the breach"
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Date/Time Discovered *</label>
                <input type="datetime-local" required value={form.discovered_at}
                  onChange={e => setForm(p => ({ ...p, discovered_at: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Severity</label>
                <select value={form.severity}
                  onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Estimated Individuals Affected</label>
                <input type="number" value={form.estimated_individuals}
                  onChange={e => setForm(p => ({ ...p, estimated_individuals: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="sa_req" checked={form.sa_notification_required}
                  onChange={e => setForm(p => ({ ...p, sa_notification_required: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="sa_req" className="text-sm text-slate-700">
                  SA notification required (starts 72h clock)
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Likely Harm to Individuals</label>
                <textarea value={form.likely_harm} rows={2}
                  onChange={e => setForm(p => ({ ...p, likely_harm: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                  {saving ? 'Logging...' : '🚨 Log Breach'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Breach list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
          </div>
        ) : breaches.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">🛡️</p>
            <p className="text-slate-600 font-medium">No breaches logged</p>
            <p className="text-sm text-slate-400 mt-1">
              Log a breach immediately when discovered — 72h clock applies
            </p>
          </div>
        ) : (
          breaches.map(b => (
            <div key={b.id} className={'bg-white rounded-xl border p-5 ' + (b.timeline?.isOverdue ? 'border-red-400' : b.timeline?.isUrgent ? 'border-orange-400' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{b.ref}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${SEV_COLORS[b.severity]}`}>
                      {b.severity}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{b.title}</h3>
                  <p className="text-xs text-slate-500">
                    Discovered: {new Date(b.discovered_at).toLocaleString('en-GB')}
                    {b.estimated_individuals && ` · ~${b.estimated_individuals.toLocaleString()} individuals`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {b.sa_notification_required && !b.sa_notified_at && b.status !== 'closed' && (
                    <button onClick={() => notifySA(b.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                      Notify SA
                    </button>
                  )}
                  {b.status !== 'closed' && (
                    <button onClick={() => closeBreach(b.id)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition">
                      Close
                    </button>
                  )}
                </div>
              </div>
              {b.timeline && b.status !== 'closed' && (
                <div className="mt-3">
                  <Clock72h timeline={b.timeline} />
                </div>
              )}
              {b.sa_notified_at && (
                <p className="text-xs text-green-700 mt-2">
                  ✅ SA notified: {new Date(b.sa_notified_at).toLocaleString('en-GB')}
                </p>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}