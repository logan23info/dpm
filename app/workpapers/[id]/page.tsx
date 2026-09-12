"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import AuditAnalysis from "@/app/components/AuditAnalysis"
import { useActor } from "@/app/components/SessionBanner"
import ReviewNotesPanel from "@/app/components/ReviewNotesPanel"
import EvidencePanel from "@/app/components/EvidencePanel"
import SignOffPanel from "@/app/components/SignOffPanel"
import controls from "@/lib/controls"

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

type Tab = "details" | "edit" | "evidence" | "notes" | "analysis"

export default function WorkpaperPage() {
  const params = useParams()
  const id = params.id as string

  const [workpaper, setWorkpaper] = useState<Workpaper | null>(null)
  const [loading, setLoading] = useState(true)
  const { actorHeaders } = useActor()
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [editForm, setEditForm] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [maturity, setMaturity] = useState<any>(null)
  const [autoDraft, setAutoDraft] = useState<any>(null)
  const [draftingFinding, setDraftingFinding] = useState(false)
  const [savingFinding, setSavingFinding] = useState(false)

  useEffect(() => { if (id) fetchWorkpaper() }, [id])

  const fetchWorkpaper = async () => {
    try {
      const res = await fetch(`/api/workpapers/${id}`)
      if (res.ok) {
        const data = await res.json()
        setWorkpaper(data)
        fetchMaturity(id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaturity = async (wpId: string) => {
    try {
      const res = await fetch(`/api/workpapers/${wpId}/maturity`)
      if (res.ok) setMaturity(await res.json())
    } catch {}
  }

  const draftFinding = async () => {
    if (!workpaper) return
    setDraftingFinding(true)
    try {
      const res = await fetch(`/api/workpapers/${workpaper.id}/auto-finding`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...actorHeaders },
      })
      const data = await res.json()
      if (res.ok) setAutoDraft(data.draft)
      else alert(data.error)
    } finally { setDraftingFinding(false) }
  }

  const saveDraftFinding = async () => {
    if (!autoDraft || !workpaper) return
    setSavingFinding(true)
    try {
      const res = await fetch(`/api/engagements/${workpaper.engagement_id}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...actorHeaders },
        body: JSON.stringify({ ...autoDraft, origin: "ai_assisted" }),
      })
      if (res.ok) {
        setAutoDraft(null)
        alert("✅ Finding saved — visible in Findings tab")
      }
    } finally { setSavingFinding(false) }
  }

  const startEdit = () => {
    if (!workpaper) return
    setEditForm({
      implementation_status: workpaper.implementation_status || "",
      test_result: workpaper.test_result || "",
      residual_risk: workpaper.residual_risk || "",
      exceptions_noted: workpaper.exceptions_noted || "",
      conclusion: workpaper.conclusion || "",
    })
    setActiveTab("edit")
  }

  const saveEdit = async () => {
    if (!editForm || !workpaper) return
    setEditSaving(true)
    setEditError("")
    try {
      const res = await fetch(`/api/workpapers/${workpaper.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...actorHeaders },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || "Failed to save"); return }
      setWorkpaper(prev => prev ? { ...prev, ...data } : prev)
      setActiveTab("details")
      setEditForm(null)
    } finally { setEditSaving(false) }
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

  const ctrl = controls.get(workpaper.control_id)
  const controlName = ctrl?.control_objective || workpaper.control_id
  const controlClause = ctrl?.clause_ref || ""
  const controlAuthority = ctrl ? controls.getAuthorityUrl(workpaper.control_id) : ""
  const isIneffective = workpaper.test_result && workpaper.test_result !== "effective" && workpaper.test_result !== "not-tested"

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
                {controlClause && (
                  <a href={controlAuthority} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline">{controlClause} →</a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">v{workpaper.version}</span>
              {maturity && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                  maturity.score >= 4 ? "bg-green-100 text-green-800 border-green-200"
                  : maturity.score >= 3 ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-red-100 text-red-800 border-red-200"
                }`}>
                  M{maturity.score} {maturity.level}
                </span>
              )}
              {!workpaper.signed_off_at && (
                <button onClick={startEdit}
                  className="text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition font-medium">
                  ✏️ Edit
                </button>
              )}
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
            { key: "edit",     label: "✏️ Edit" },
            { key: "evidence", label: "📎 Evidence" },
            { key: "notes",    label: "📝 Review Notes" },
            { key: "analysis", label: "🤖 AI Analysis" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key}
              onClick={() => t.key === "edit" && !workpaper.signed_off_at ? startEdit() : setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === t.key
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-10">

        {/* ── Details Tab ─────────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">

              {/* Assessment fields */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">Control Assessment</h2>
                {[
                  { label: "Implementation Status", value: workpaper.implementation_status },
                  { label: "Test Result",           value: workpaper.test_result },
                  { label: "Residual Risk",         value: workpaper.residual_risk },
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
                    <p className="mt-1 text-sm text-slate-700 bg-red-50 border border-red-100 rounded-lg p-3">{workpaper.exceptions_noted}</p>
                  </div>
                )}
                {workpaper.conclusion && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Conclusion</label>
                    <p className="mt-1 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">{workpaper.conclusion}</p>
                  </div>
                )}
              </div>

              {/* Regulatory refs */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">📜 Regulatory References</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "GDPR Full Text (EUR-Lex)", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679" },
                    { label: "EDPB Guidelines",          url: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en" },
                    { label: "DPDP Act 2023 (MeitY)",   url: "https://www.meity.gov.in/sites/upload_files/dit/files/The%20Digital%20Personal%20Data%20Protection%20Act%2C%202023.pdf" },
                    { label: "ICO UK Guidance",          url: "https://ico.org.uk/for-organisations/guide-to-data-protection/" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-slate-700">{r.label}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Open →</a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Draft Finding */}
              {isIneffective && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-2">🤖 Auto-Draft Finding</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Control is {workpaper.test_result}. AI can draft a structured finding for your review.
                  </p>
                  {!autoDraft ? (
                    <button onClick={draftFinding} disabled={draftingFinding}
                      className="w-full bg-rose-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {draftingFinding ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Drafting...</>
                      ) : "🤖 Draft Finding"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm space-y-2">
                        <p className="font-semibold text-slate-900">{autoDraft.title}</p>
                        <p className="text-slate-600 whitespace-pre-wrap text-xs">{autoDraft.description}</p>
                        {autoDraft.recommendation && (
                          <div className="border-t border-rose-200 pt-2">
                            <p className="text-xs font-medium text-slate-600">Recommendation:</p>
                            <p className="text-xs text-slate-600">{autoDraft.recommendation}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-amber-700">⚠️ Review and edit before saving</p>
                      <div className="flex gap-2">
                        <button onClick={saveDraftFinding} disabled={savingFinding}
                          className="flex-1 bg-rose-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition">
                          {savingFinding ? "Saving..." : "✅ Save Finding"}
                        </button>
                        <button onClick={() => setAutoDraft(null)}
                          className="px-3 border border-slate-300 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition">
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sign-off */}
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

        {/* ── Edit Tab ────────────────────────────────────────────────── */}
        {activeTab === "edit" && !workpaper.signed_off_at && editForm && (
          <div className="bg-white rounded-xl border border-amber-300 p-6 space-y-4">
            <h2 className="font-bold text-slate-900">Edit Workpaper Assessment</h2>
            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{editError}</div>
            )}
            {[
              { key: "implementation_status", label: "Implementation Status",
                opts: ["", "implemented", "partial", "not-implemented", "not-applicable"] },
              { key: "test_result", label: "Test Result",
                opts: ["", "effective", "partial", "ineffective", "not-tested"] },
              { key: "residual_risk", label: "Residual Risk",
                opts: ["", "low", "medium", "high", "critical"] },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <select value={editForm[f.key] || ""}
                  onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {f.opts.map(o => <option key={o} value={o}>{o || "Select..."}</option>)}
                </select>
              </div>
            ))}
            {["exceptions_noted", "conclusion"].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                  {field.replace("_", " ")}
                </label>
                <textarea rows={3} value={editForm[field] || ""}
                  onChange={e => setEditForm((p: any) => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => { setEditForm(null); setActiveTab("details") }}
                className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
        {activeTab === "edit" && workpaper.signed_off_at && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-800 font-medium">🔒 This workpaper is signed off and locked.</p>
            <p className="text-sm text-amber-600 mt-1">Revert sign-off to edit.</p>
          </div>
        )}

        {/* ── Evidence Tab ────────────────────────────────────────────── */}
        {activeTab === "evidence" && <EvidencePanel workpaperId={workpaper.id} />}

        {/* ── Review Notes Tab ────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <ReviewNotesPanel workpaperId={workpaper.id} isLocked={!!workpaper.signed_off_at} />
        )}

        {/* ── AI Analysis Tab ─────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <AuditAnalysis
            controlId={workpaper.control_id}
            controlName={controlName}
            workpaperId={workpaper.id}
            testResult={workpaper.test_result}
            implementationStatus={workpaper.implementation_status}
            exceptions={workpaper.exceptions_noted}
            isLocked={!!workpaper.signed_off_at}
          />
        )}
      </main>
    </div>
  )
}