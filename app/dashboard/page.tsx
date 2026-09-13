"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useActor } from "@/app/components/SessionBanner"

interface EngRow { id:string; name:string; status:string; frameworks:string[]; wp_total:number; wp_signed:number; wp_effective:number; find_open:number; find_critical:number }

export default function DashboardPage() {
  const { actor } = useActor()
  const [engagements, setEngagements] = useState<EngRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalEng:0, openFindings:0, critical:0, avgEffectiveness:0 })
  useEffect(() => { fetchDashboard() }, [])
  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard?t=" + Date.now())
      if (res.ok) { const d = await res.json(); setEngagements(d.engagements); setStats(d.stats) }
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }
  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
    </div>
  )
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            {actor && <p className="text-sm text-slate-500 mt-0.5">Welcome, {actor.name}</p>}
          </div>
          <Link href="/engagements/new" className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">+ New Engagement</Link>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label:"Engagements",       value:String(stats.totalEng),        color:"text-slate-900", bg:"bg-white" },
            { label:"Open Findings",     value:String(stats.openFindings),    color:"text-red-600",   bg:"bg-red-50" },
            { label:"Critical",          value:String(stats.critical),        color:"text-red-700",   bg:"bg-red-50" },
            { label:"Avg Effectiveness", value:`${stats.avgEffectiveness}%`,  color:"text-green-700", bg:"bg-green-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200 p-5`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        {engagements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 font-medium">No engagements yet</p>
            <Link href="/engagements/new" className="mt-4 inline-block px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">Create First Engagement</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {engagements.map(eng => {
              const eff = eng.wp_total > 0 ? Math.round((eng.wp_effective / eng.wp_total) * 100) : 0
              return (
                <Link key={eng.id} href={`/engagements/${eng.id}`} className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-400 hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">{eng.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{eng.frameworks?.join(" · ")}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-slate-500">Effectiveness: <strong className={eff>=80?"text-green-600":eff>=60?"text-amber-600":"text-red-600"}>{eff}%</strong></span>
                        <span className="text-slate-500">Signed: <strong>{eng.wp_signed}/{eng.wp_total}</strong></span>
                        {eng.find_open > 0 && <span className="text-red-600 font-medium">{eng.find_open} open findings</span>}
                        {eng.find_critical > 0 && <span className="text-red-700 font-bold">{eng.find_critical} critical</span>}
                      </div>
                    </div>
                    <span className="text-slate-300 ml-4">&#8594;</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
