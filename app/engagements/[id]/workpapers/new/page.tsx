"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import controls from "@/lib/controls"

const ALL_CONTROLS = controls.all()
const FRAMEWORKS = controls.frameworks()

export default function NewWorkpaperPage() {
  const router = useRouter()
  const params = useParams()
  const engagementId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedFw, setSelectedFw] = useState("All")
  const [form, setForm] = useState({
    control_id: "",
    implementation_status: "",
    test_result: "",
    residual_risk: "",
    conclusion: "",
    exceptions_noted: "",
  })

  const filtered = selectedFw === "All"
    ? ALL_CONTROLS
    : ALL_CONTROLS.filter(c => c.framework === selectedFw)

  const selectedCtrl = controls.get(form.control_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.control_id) { setError("Select a control"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/workpapers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: engagementId, ...form }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return }
      router.push(`/engagements/${engagementId}`)
    router.refresh()
    } catch (e) { setError("Network error") } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href={`/engagements/${engagementId}`} className="text-slate-500 hover:text-slate-700 text-sm">
              Back to Engagement
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">New Workpaper</h1>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-bold text-slate-900">Select Control</h2>
            <div className="flex gap-2 flex-wrap">
              {["All", ...FRAMEWORKS].map(fw => (
                <button key={fw} type="button" onClick={() => setSelectedFw(fw)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${selectedFw===fw?"bg-amber-600 text-white border-amber-600":"bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {fw}
                </button>
              ))}
            </div>
            <select required value={form.control_id} onChange={e => setForm(p => ({ ...p, control_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Select a control...</option>
              {filtered.map(c => (
                <option key={c.id} value={c.id}>{c.id} — {c.control_objective.slice(0, 60)}</option>
              ))}
            </select>
            {selectedCtrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-slate-800">{selectedCtrl.clause_ref}</p>
                <p className="text-slate-600">{selectedCtrl.control_objective}</p>
                <p className="text-slate-500">Risk: {selectedCtrl.inherent_risk} · {selectedCtrl.frequency}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-bold text-slate-900">Initial Assessment (optional)</h2>
            {[
              { key:"implementation_status", label:"Implementation Status", opts:["","implemented","partial","not-implemented","not-applicable"] },
              { key:"test_result", label:"Test Result", opts:["","effective","partial","ineffective","not-tested"] },
              { key:"residual_risk", label:"Residual Risk", opts:["","low","medium","high","critical"] },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <select value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {f.opts.map(o => <option key={o} value={o}>{o || "Not assessed"}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conclusion</label>
              <textarea rows={3} value={form.conclusion} onChange={e => setForm(p => ({ ...p, conclusion: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <button type="submit" disabled={loading || !form.control_id}
            className="w-full bg-amber-600 text-white font-semibold py-3 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition">
            {loading ? "Creating..." : "Create Workpaper"}
          </button>
        </form>
      </main>
    </div>
  )
}
