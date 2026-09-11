"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import AuditAnalysis from "@/app/components/AuditAnalysis"
import EvidencePanel from "@/app/components/EvidencePanel"
import SignOffPanel from "@/app/components/SignOffPanel"

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
  reviewed_by: string | null
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
  "DPDP-1":  "Consent — Data Principal",
  "DPDP-2":  "Notice & Transparency",
  "DPDP-3":  "Data Principal Rights",
  "DPDP-4":  "Security Safeguards",
  "DPDP-5":  "Data Processor Management",
  "DPDP-6":  "Significant Data Fiduciary Obligations",
  "DPDP-7":  "Cross-Border Transfers",
}

type Tab = "details" | "evidence" | "analysis"

export default function WorkpaperPage() {
  const params = useParams()
  const id = params.id as string

  const [workpaper, setWorkpaper] = useState<Workpaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("details")

  useEffect(() => { if (id) fetchWorkpaper() }, [id])

  const fetchWorkpaper = async () => {
    try {
      const res = await fetch(`/api/workpapers/${id}`)
      if (res.ok) setWorkpaper(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
    </div>
  )

  if (!workpaper) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-slate-600 mb-4">Workpaper not found</p>
        <Link href="/dashboard" className="text-amber-600 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  )

  const controlName = CONTROL_NAMES[workpaper.control_id] || workpaper.control_id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/engagements/${workpaper.engagement_id}`} className="text-slate-500 hover:text-slate-700 text-sm">
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
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">✓ Signed Off</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">Pending Review</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          {([
            { key: "details",  label: "📋 Details" },
            { key: "evidence", label: "📎 Evidence" },
            { key: "analysis", label: "🤖 AI Analysis" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === t.key
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-10">

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workpaper Fields */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Control Assessment</h2>

                {[
                  { label: "Implementation Status", value: workpaper.implementation_status },
                  { label: "Test Result", value: workpaper.test_result },
                  { label: "Residual Risk", value: workpaper.residual_risk },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{f.label}</label>
                    <div className="mt-1">
                      {f.value ? (
                        <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[f.value] || "bg-slate-100 text-slate-600"}`}>
                          {f.value}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Not assessed</span>
                      )}
                    </div>
                  </div>
                ))}

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

              {/* GDPR Quick Reference */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">📜 Regulatory References</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "GDPR Full Text (EUR-Lex)", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679" },
                    { label: "EDPB Guidelines", url: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en" },
                    { label: "DPDP Act 2023 (MeitY)", url: "https://www.meity.gov.in/sites/upload_files/dit/files/The%20Digital%20Personal%20Data%20Protection%20Act%2C%202023.pdf" },
                    { label: "ICO UK Guidance", url: "https://ico.org.uk/for-organisations/guide-to-data-protection/" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-slate-700">{r.label}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Open →</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sign-Off */}
            <div>
              <SignOffPanel
                workpaperId={workpaper.id}
                signedOffAt={workpaper.signed_off_at}
                reviewedBy={workpaper.reviewed_by}
                onUpdate={(data) => setWorkpaper(prev => prev ? { ...prev, ...data } : prev)}
              />
            </div>
          </div>
        )}

        {/* Evidence Tab */}
        {activeTab === "evidence" && (
          <EvidencePanel workpaperId={workpaper.id} />
        )}

        {/* AI Analysis Tab */}
        {activeTab === "analysis" && (
          <AuditAnalysis
            controlId={workpaper.control_id}
            controlName={controlName}
            testResult={workpaper.test_result}
            implementationStatus={workpaper.implementation_status}
            exceptions={workpaper.exceptions_noted}
          />
        )}
      </main>
    </div>
  )
}
