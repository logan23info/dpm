"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function NewFindingPage() {
  const router = useRouter()
  const params = useParams()
  const engagementId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "",
    severity: "medium",
    description: "",
    remediation: "",
    due_date: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { setError("Title is required"); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/engagements/${engagementId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create finding")
        return
      }

      router.push(`/engagements/${engagementId}?tab=findings`)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href={`/engagements/${engagementId}`} className="text-slate-500 hover:text-slate-700 text-sm">
              ← Back to Engagement
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">New Finding</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-8 space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Finding Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Missing Data Processing Agreement with vendor"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
            <div className="grid grid-cols-4 gap-3">
              {["low", "medium", "high", "critical"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, severity: s }))}
                 const cls1 = form.severity === s ? s === "critical" ? "bg-red-600 border-red-600 text-white" : s === "high" ? "bg-orange-500 border-orange-500 text-white" : s === "medium" ? "bg-amber-500 border-amber-500 text-white" : "bg-blue-500 border-blue-500 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-amber-400" }
                  className={"py-2 rounded-lg border text-sm font-medium capitalize transition " + cls1}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Describe the finding in detail..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Remediation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Recommended Remediation</label>
            <textarea
              value={form.remediation}
              onChange={e => setForm(prev => ({ ...prev, remediation: e.target.value }))}
              rows={3}
              placeholder="Steps to remediate this finding..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Remediation Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
            >
              {loading ? "Creating..." : "Create Finding"}
            </button>
            <Link
              href={`/engagements/${engagementId}`}
              className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}