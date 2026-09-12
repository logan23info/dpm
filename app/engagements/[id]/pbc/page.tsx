'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface PBCItem {
  id: string
  ref: string
  control_id: string | null
  description: string
  document_type: string | null
  owner: string | null
  due_date: string | null
  status: 'outstanding' | 'received' | 'partial' | 'waived'
  chase_count: number
  last_chased_at: string | null
  notes: string | null
}

interface Summary {
  total: number
  outstanding: number
  partial: number
  received: number
  overdue: number
}

const STATUS_CONFIG = {
  outstanding: { label: 'Outstanding', color: 'bg-red-100 text-red-800',    dot: 'bg-red-500' },
  partial:     { label: 'Partial',     color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  received:    { label: 'Received',    color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  waived:      { label: 'Waived',      color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
}

export default function PBCPage() {
  const params = useParams()
  const router = useRouter()
  const { actorHeaders } = useActor()
  const id = params.id as string

  const [items, setItems] = useState<PBCItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<string>('All')

  useEffect(() => { fetchPBC() }, [id])

  const fetchPBC = async () => {
    try {
      const res = await fetch(`/api/engagements/${id}/pbc`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
        setSummary(data.summary)
      }
    } finally { setLoading(false) }
  }

  const act = async (itemId: string, action: string, extra?: object) => {
    await fetch(`/api/engagements/${id}/pbc`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ id: itemId, action, ...extra }),
    })
    fetchPBC()
  }

  const autoGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/engagements/${id}/pbc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ autoGenerate: true }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchPBC()
        alert(`✅ ${data.message}`)
      } else {
        alert(`❌ ${data.error}`)
      }
    } finally { setGenerating(false) }
  }

  const isOverdue = (item: PBCItem) =>
    item.status === 'outstanding' && item.due_date && new Date(item.due_date) < new Date()

  const filtered = filter === 'All' ? items
    : items.filter(i => i.status === filter.toLowerCase())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href={`/engagements/${id}`} className="text-slate-500 hover:text-slate-700 text-sm">
                ← Engagement
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">PBC — Evidence Requests</h1>
                <p className="text-sm text-slate-500">Prepared By Client list · track, chase, receive</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={autoGenerate} disabled={generating}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                {generating ? 'Generating...' : '⚡ Auto-Generate from Scope'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-5 gap-4 text-center">
            {[
              { label: 'Total',       value: summary.total,       color: 'text-slate-900' },
              { label: 'Outstanding', value: summary.outstanding, color: 'text-red-600' },
              { label: 'Partial',     value: summary.partial,     color: 'text-amber-600' },
              { label: 'Received',    value: summary.received,    color: 'text-green-600' },
              { label: 'Overdue',     value: summary.overdue,     color: 'text-red-700 font-bold' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {['All', 'outstanding', 'partial', 'received', 'waived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition capitalize ${
                filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              {f === 'All' ? 'All' : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.label || f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-slate-600 font-medium mb-2">No PBC items yet</p>
            <p className="text-sm text-slate-400 mb-4">
              Complete scoping first, then auto-generate from in-scope controls
            </p>
            <Link href={`/engagements/${id}/scope`}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition">
              Go to Scoping →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const cfg = STATUS_CONFIG[item.status]
              const overdue = isOverdue(item)
              return (
                <div key={item.id} className={`bg-white rounded-lg border p-4 ${
                  overdue ? 'border-red-300' : 'border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-500">{item.ref}</span>
                        {item.control_id && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{item.control_id}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {overdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                            OVERDUE
                          </span>
                        )}
                        {item.chase_count > 0 && (
                          <span className="text-xs text-slate-400">
                            Chased {item.chase_count}×
                            {item.last_chased_at && ` (last: ${new Date(item.last_chased_at).toLocaleDateString('en-GB')})`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 mb-1">{item.description}</p>
                      <div className="flex gap-4 text-xs text-slate-400">
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.due_date && <span>Due: {new Date(item.due_date).toLocaleDateString('en-GB')}</span>}
                        {item.document_type && <span>{item.document_type}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.status === 'outstanding' && (
                        <>
                          <button onClick={() => act(item.id, 'receive')}
                            className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition">
                            ✓ Received
                          </button>
                          <button onClick={() => act(item.id, 'chase')}
                            className="px-2.5 py-1.5 border border-amber-400 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 transition">
                            Chase
                          </button>
                        </>
                      )}
                      {item.status === 'received' && (
                        <span className="text-xs text-green-600 font-medium self-center">✅ Complete</span>
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
