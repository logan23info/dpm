"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const FRAMEWORKS = ["GDPR", "ISO 27701", "DPDP Act 2023", "NIST Privacy Framework", "SOC 2"]

export default function NewEngagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    frameworks: [] as string[],
    period_start: "",
    period_end: "",
  })

  const toggleFramework = (fw: string) => {
    setForm(prev => ({
      ...prev,
      frameworks: prev.frameworks.includes(fw)
        ? prev.frameworks.filter(f => f !== fw)
        : [...prev.frameworks, fw]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { setError("Engagement name is required"); return }
    if (form.frameworks.length === 0) { setError("Select at least one framework"); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create engagement")
        return
      }

      const engagement = await res.json()
      router.push(`/engagements/${engagement.id}`)
      router.refresh()
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
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">New Engagement</h1>
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

          {/* Engagement Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Engagement Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. GDPR Audit Q3 2026"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Frameworks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Frameworks <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => toggleFramework(fw)}
                 const cls1 = form.frameworks.includes(fw) ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-amber-400" }
                  className={"px-4 py-2 rounded-lg border text-sm font-medium transition " + cls1}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Period Start</label>
              <input
                type="date"
                value={form.period_start}
                onChange={e => setForm(prev => ({ ...prev, period_start: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Period End</label>
              <input
                type="date"
                value={form.period_end}
                onChange={e => setForm(prev => ({ ...prev, period_end: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {loading ? "Creating..." : "Create Engagement"}
            </button>
            <Link
              href="/dashboard"
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