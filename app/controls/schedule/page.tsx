'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActor } from '@/app/components/SessionBanner'

interface ScheduleItem {
  id: string
  control_id: string
  control_objective: string
  clause_ref: string
  framework: string
  frequency: string
  last_tested: string | null
  next_due: string | null
  assigned_to: string | null
  status: string
  isOverdue: boolean
  isDueSoon: boolean
  daysUntilDue: number | null
  key_control: boolean
  inherent_risk: string
}

interface Summary { total: number; overdue: number; dueSoon: number; scheduled: number }

const STATUS_COLOR = (item: ScheduleItem) =>
  item.isOverdue ? 'border-red-300 bg-red-50'
  : item.isDueSoon ? 'border-amber-300 bg-amber-50'
  : 'border-slate-200 bg-white'

const FW_COLORS: Record<string, string> = {
  GDPR:'bg-blue-100 text-blue-800', DPDP:'bg-green-100 text-green-800',
  ISO27701:'bg-purple-100 text-purple-800', NISTPF:'bg-amber-100 text-amber-800', SOC2:'bg-slate-100 text-slate-700',
}

export default function SchedulePage() {
  const { actorHeaders } = useActor()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => { fetchSchedule() }, [filter])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/controls/schedule?filter=${filter}`)
      if (res.ok) { const d = await res.json(); setItems(d.schedule); setSummary(d.summary) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const markComplete = async (id: string) => {
    setCompleting(id)
    try {
      await fetch('/api/controls/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ id, action: 'complete' }),
      })
      fetchSchedule()
    } catch (e) { console.error(e) } finally { setCompleting(null) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/controls" className="text-slate-500 hover:text-slate-700 text-sm">← Control Library</Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Monitoring Calendar</h1>
              <p className="text-sm text-slate-500">Continuous control monitoring schedule</p>
            </div>
          </div>
        </div>

        {summary && (
          <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-6">
            {[
              { label: 'Total', value: summary.total, color: 'text-slate-900' },
              { label: 'Overdue', value: summary.overdue, color: 'text-red-600' },
              { label: 'Due Soon', value: summary.dueSoon, color: 'text-amber-600' },
              { label: 'Scheduled', value: summary.scheduled, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
            <div className="flex gap-2 ml-auto items-center">
              {['all', 'overdue', 'due_soon'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize ${filter===f?'bg-slate-800 text-white border-slate-800':'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-slate-600 font-medium">No controls scheduled yet</p>
            <p className="text-sm text-slate-400 mt-1">Controls are added to the calendar when workpapers are created</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className={`rounded-xl border p-4 ${STATUS_COLOR(item)}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-700">{item.control_id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${FW_COLORS[item.framework]||''}`}>{item.framework}</span>
                      {item.key_control && <span className="text-amber-500 text-xs font-bold">★ Key</span>}
                      {item.isOverdue && <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full font-bold">OVERDUE</span>}
                      {item.isDueSoon && !item.isOverdue && <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full">Due Soon</span>}
                    </div>
                    <p className="text-sm text-slate-700">{item.control_objective}</p>
                    <div className="flex gap-4 text-xs text-slate-400 mt-1">
                      <span>Frequency: {item.frequency}</span>
                      {item.last_tested && <span>Last tested: {new Date(item.last_tested).toLocaleDateString('en-GB')}</span>}
                      {item.next_due && (
                        <span className={item.isOverdue ? 'text-red-600 font-bold' : item.isDueSoon ? 'text-amber-600' : ''}>
                          Next due: {new Date(item.next_due).toLocaleDateString('en-GB')}
                          {item.daysUntilDue !== null && ` (${item.daysUntilDue > 0 ? `in ${item.daysUntilDue}d` : `${Math.abs(item.daysUntilDue)}d ago`})`}
                        </span>
                      )}
                      {item.assigned_to && <span>Assigned: {item.assigned_to}</span>}
                    </div>
                  </div>
                  <button onClick={() => markComplete(item.id)} disabled={completing === item.id}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition shrink-0">
                    {completing === item.id ? '...' : '✓ Mark Tested'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
