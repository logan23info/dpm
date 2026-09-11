"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import AuditAnalysis from "@/app/components/AuditAnalysis"

interface Workpaper {
  id: string
  engagement_id: string
  control_id: string
  version: number
  implementation_status: string
  test_result: string
  residual_risk: string
  exceptions_noted: string
  conclusion: string
  signed_off_at: string | null
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  implemented: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  "not-implemented": "bg-red-100 text-red-800",
  "not-applicable": "bg-slate-100 text-slate-600",
  effective: "bg-green-100 text-green-800",
  ineffective: "bg-red-100 text-red-800",
  "not-tested": "bg-slate-100 text-slate-600",
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

// Control name lookup (from GDPR seed data)
const CONTROL_NAMES: Record<string, string> = {
  "GDPR-1":  "Data Retention & Storage Limitation",
  "GDPR-2":  "Lawful Basis for Processing",
  "GDPR-3":  "Consent Management",
  "GDPR-4":  "Privacy Notice & Transparency",
  "GDPR-5":  "Data Subject Rights",
  "GDPR-6":  "Privacy by Design & Default",
  "GDPR-7":  "Data Processing Agreements",
  "GDPR-8":  "Records of Processing Activities (RoPA)",
  "GDPR-9":  "Technical & Organisational Security Measures",
  "GDPR-10": "Breach Detection & Notification",
  "GDPR-11": "Data Protection Impact Assessment (DPIA)",
  "GDPR-12": "Data Protection Officer (DPO)",
  "GDPR-13": "International Data Transfers",
  "GDPR-14": "Compliance & Enforcement",
}

export default function WorkpaperPage() {
  const params = useParams()
  const id = params.id as string

  const [workpaper, setWorkpaper] = useState<Workpaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnalysis, setShowAnalysis] = useState(false)

  useEffect(() => {
    if (id) fetchWorkpaper()
  }, [id])

  const fetchWorkpaper = async () => {
    try {
      const res = await fetch(`/api/workpapers/${id}`)
      if (res.ok) setWorkpaper(await res.json())
    } catch (error) {
      console.error("Failed to fetch workpaper:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    )
  }

  if (!workpaper) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Workpaper not found</p>
          <Link href="/dashboard" className="text-amber-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const controlName = CONTROL_NAMES[workpaper.control_id] || workpaper.control_id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/engagements/${workpaper.engagement_id}`}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                ← Engagement
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{workpaper.control_id}</h1>
                <p className="text-sm text-slate-500">{controlName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">v{workpaper.version}</span>
              {workpaper.signed_off_at ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  ✓ Signed Off
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Workpaper Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Workpaper Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Implementation Status</label>
                <div className="mt-1">
                  {workpaper.implementation_status ? (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[workpaper.implementation_status] || "bg-slate-100 text-slate-600"}`}>
                      {workpaper.implementation_status}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Not assessed</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Test Result</label>
                <div className="mt-1">
                  {workpaper.test_result ? (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[workpaper.test_result] || "bg-slate-100 text-slate-600"}`}>
                      {workpaper.test_result}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Not tested</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Residual Risk</label>
                <div className="mt-1">
                  {workpaper.residual_risk ? (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[workpaper.residual_risk] || "bg-slate-100 text-slate-600"}`}>
                      {workpaper.residual_risk}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Not rated</span>
                  )}
                </div>
              </div>

              {workpaper.exceptions_noted && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Exceptions Noted</label>
                  <p className="mt-1 text-sm text-slate-700 bg-red-50 border border-red-100 rounded-lg p-3">
                    {workpaper.exceptions_noted}
                  </p>
                </div>
              )}

              {workpaper.conclusion && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Conclusion</label>
                  <p className="mt-1 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">
                    {workpaper.conclusion}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* GDPR Quick Reference */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">📜 GDPR Quick Reference</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-slate-700">Full GDPR Text (EUR-Lex)</span>
                <a
                  href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  Open →
                </a>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-slate-700">EDPB Guidelines</span>
                <a
                  href="https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  Open →
                </a>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-slate-700">ICO Guidance (UK)</span>
                <a
                  href="https://ico.org.uk/for-organisations/guide-to-data-protection/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  Open →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Analysis */}
        <div>
          {!showAnalysis ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-bold text-slate-900 mb-2">AI Audit Analysis</h3>
              <p className="text-slate-500 text-sm mb-6">
                Get AI-powered TOD, TOE, TOI analysis for this control — in Advisory or Assurance mode.
                Grounded in authoritative GDPR sources.
              </p>
              <div className="flex gap-3 justify-center mb-4">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1 text-lg">💡</div>
                  <p className="text-xs text-slate-600">Advisory<br/>DPO Guidance</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1 text-lg">🔍</div>
                  <p className="text-xs text-slate-600">Assurance<br/>Audit Opinion</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysis(true)}
                className="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition"
              >
                Launch AI Analysis →
              </button>
            </div>
          ) : (
            <AuditAnalysis
              controlId={workpaper.control_id}
              controlName={controlName}
              testResult={workpaper.test_result}
              implementationStatus={workpaper.implementation_status}
              exceptions={workpaper.exceptions_noted}
            />
          )}
        </div>
      </main>
    </div>
  )
}
