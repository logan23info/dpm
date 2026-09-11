"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

const CONTROLS = [
  "GDPR-1", "GDPR-2", "GDPR-3", "GDPR-4", "GDPR-5",
  "ISO27701-1", "ISO27701-2", "ISO27701-3",
  "DPDP-1", "DPDP-2", "DPDP-3",
  "NIST-1", "NIST-2", "NIST-3",
  "SOC2-1", "SOC2-2", "SOC2-3",
]

export default function NewWorkpaperPage() {
  const router = useRouter()
  const params = useParams()
  const engagementId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    control_id: "",
    implementation_status: "",
    test_result: "",
    residual_risk: "",
    conclusion: "",
    exceptions_noted: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.control_id) { setError("Control ID is required"); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/workpapers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: engagementId, ...form }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create workpaper")
        return
      }

      router.push(`/engagements/${engagementId}`)
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
            <h1 className="text-2xl font-bold text-slate-900">New Workpaper</h1>
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

          {/* Control ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Control ID <span className="text-red-500">*</span>
            </label>
            <select
              value={form.control_id}
              onChange={e => setForm(prev => ({ ...prev, control_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select a control...</option>
              {CONTROLS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Implementation Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Implementation Status</label>
            <select
              value={form.implementation_status}
              onChange={e => setForm(prev => ({ ...prev, implementation_status: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              <option value="implemented">Implemented</option>
              <option value="partial">Partially Implemented</option>
              <option value="not-implemented">Not Implemented</option>
              <option value="not-applicable">Not Applicable</option>
            </select>
          </div>

          {/* Test Result */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Result</label>
            <select
              value={form.test_result}
              onChange={e => setForm(prev => ({ ...prev, test_result: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              <option value="effective">Effective</option>
              <option value="ineffective">Ineffective</option>
              <option value="partial">Partially Effective</option>
              <option value="not-tested">Not Tested</option>
            </select>
          </div>

          {/* Residual Risk */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Residual Risk</label>
            <select
              value={form.residual_risk}
              onChange={e => setForm(prev => ({ ...prev, residual_risk: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Exceptions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exceptions Noted</label>
            <textarea
              value={form.exceptions_noted}
              onChange={e => setForm(prev => ({ ...prev, exceptions_noted: e.target.value }))}
              rows={3}
              placeholder="Describe any exceptions noted during testing..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Conclusion */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Conclusion</label>
            <textarea
              value={form.conclusion}
              onChange={e => setForm(prev => ({ ...prev, conclusion: e.target.value }))}
              rows={3}
              placeholder="Overall conclusion for this control..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {loading ? "Creating..." : "Create Workpaper"}
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
