"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Workpaper {
  id: string
  control_id: string
  version: number
  implementation_status: string
  test_result: string
  residual_risk: string
  conclusion: string
  signed_off_at: string
  updated_at: string
}

interface Engagement {
  id: string
  name: string
  frameworks: string[]
  period_start: string
  period_end: string
  status: string
}

interface Finding {
  id: string
  title: string
  severity: string
  status: string
  description: string
}

const STATUS_COLORS: Record<string, string> = {
  effective: "bg-green-100 text-green-800",
  ineffective: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
  "not-tested": "bg-slate-100 text-slate-600",
  open: "bg-red-100 text-red-800",
  "in-progress": "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-800",
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

export default function EngagementPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [engagement, setEngagement] = useState<Engagement | null>(null)
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"workpapers" | "findings">("workpapers")

  useEffect(() => {
    if (id) fetchAll()
  }, [id])

  const fetchAll = async () => {
    try {
      const [engRes, wpRes, findRes] = await Promise.all([
        fetch(`/api/engagements/${id}`),
        fetch(`/api/engagements/${id}/workpapers`),
        fetch(`/api/engagements/${id}/findings`),
      ])

      if (engRes.ok) setEngagement(await engRes.json())
      if (wpRes.ok) setWorkpapers(await wpRes.json())
      if (findRes.ok) setFindings(await findRes.json())
    } catch (error) {
      console.error("Failed to fetch:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (!engagement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Engagement not found</p>
          <Link href="/dashboard" className="text-amber-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
                ← Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{engagement.name}</h1>
                <p className="text-sm text-slate-500">
                  {engagement.frameworks?.join(" · ")} · {engagement.period_start} to {engagement.period_end}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/engagements/${id}/workpapers/new`}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition"
              >
                + Add Workpaper
              </Link>
              <Link
                href={`/engagements/${id}/findings/new`}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
              >
                + Add Finding
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{workpapers.length}</p>
              <p className="text-xs text-slate-500">Workpapers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {workpapers.filter(w => w.signed_off_at).length}
              </p>
              <p className="text-xs text-slate-500">Signed Off</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {findings.filter(f => f.status === "open").length}
              </p>
              <p className="text-xs text-slate-500">Open Findings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {findings.filter(f => f.severity === "high" || f.severity === "critical").length}
              </p>
              <p className="text-xs text-slate-500">High/Critical</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("workpapers")}
            className={`pb-3 text-sm font-medium border-b-2 transition ${
              activeTab === "workpapers"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Workpapers ({workpapers.length})
          </button>
          <button
            onClick={() => setActiveTab("findings")}
            className={`pb-3 text-sm font-medium border-b-2 transition ${
              activeTab === "findings"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Findings ({findings.length})
          </button>
        </div>

        {/* Workpapers Tab */}
        {activeTab === "workpapers" && (
          <div className="space-y-3">
            {workpapers.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500 mb-4">No workpapers yet</p>
                <Link
                  href={`/engagements/${id}/workpapers/new`}
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
                >
                  Add First Workpaper
                </Link>
              </div>
            ) : (
              workpapers.map(wp => (
                <Link
                  key={wp.id}
                  href={`/workpapers/${wp.id}`}
                  className="block bg-white rounded-lg border border-slate-200 p-5 hover:border-amber-400 hover:shadow transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{wp.control_id}</p>
                      <p className="text-sm text-slate-500 mt-1">Version {wp.version}</p>
                    </div>
                    <div className="flex gap-2">
                      {wp.test_result && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[wp.test_result] || "bg-slate-100 text-slate-600"}`}>
                          {wp.test_result}
                        </span>
                      )}
                      {wp.signed_off_at && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-green-100 text-green-800">
                          ✓ Signed Off
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === "findings" && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500 mb-4">No findings yet</p>
                <Link
                  href={`/engagements/${id}/findings/new`}
                  className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
                >
                  Add First Finding
                </Link>
              </div>
            ) : (
              findings.map(f => (
                <div
                  key={f.id}
                  className="bg-white rounded-lg border border-slate-200 p-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{f.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{f.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[f.severity] || "bg-slate-100"}`}>
                        {f.severity}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[f.status] || "bg-slate-100"}`}>
                        {f.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
