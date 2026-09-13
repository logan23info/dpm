"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ImportFindingsModal from "@/app/components/ImportFindingsModal"
import BulkWorkpaperModal from "@/app/components/BulkWorkpaperModal"
import AnalyticsDashboard from "@/app/components/AnalyticsDashboard"
import { useActor } from "@/app/components/SessionBanner"

interface Workpaper { id:string; control_id:string; version:number; implementation_status:string; test_result:string; residual_risk:string; signed_off_at:string|null }
interface Engagement { id:string; name:string; frameworks:string[]; period_start:string; period_end:string; status:string }
interface Finding { id:string; title:string; severity:string; status:string; description:string }

const STATUS_COLORS:Record<string,string> = {
  effective:"bg-green-100 text-green-800", ineffective:"bg-red-100 text-red-800",
  partial:"bg-amber-100 text-amber-800", "not-tested":"bg-slate-100 text-slate-600",
  open:"bg-red-100 text-red-800", "in-progress":"bg-amber-100 text-amber-800",
  remediated:"bg-blue-100 text-blue-800", closed:"bg-green-100 text-green-800",
  low:"bg-blue-100 text-blue-800", medium:"bg-amber-100 text-amber-800",
  high:"bg-orange-100 text-orange-800", critical:"bg-red-100 text-red-800",
}

type Tab = "workpapers"|"findings"|"analytics"

export default function EngagementPage() {
  const params = useParams()
  const id = params.id as string
  const { actorHeaders } = useActor()
  const [engagement, setEngagement] = useState<Engagement|null>(null)
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("workpapers")
  const [showImport, setShowImport] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [contradictions, setContradictions] = useState<any[]>([])
  const [contradictionSummary, setContradictionSummary] = useState<any>(null)
  const [checkingContradictions, setCheckingContradictions] = useState(false)
  const [showAISummary, setShowAISummary] = useState(false)
  const [aiSummary, setAiSummary] = useState("")
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [priorYear, setPriorYear] = useState<any>(null)
  const [checkingPriorYear, setCheckingPriorYear] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (id) fetchAll() }, [id])

  const startEdit = () => {
    setEditForm({ name: engagement?.name || '', status: engagement?.status || 'active', period_start: engagement?.period_start || '', period_end: engagement?.period_end || '' })
    setShowEdit(true)
  }

  const saveEdit = async () => {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/engagements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify(editForm),
      })
      if (res.ok) { const d = await res.json(); setEngagement(prev => prev ? { ...prev, ...d } : prev); setShowEdit(false) }
    } finally { setEditSaving(false) }
  }

  const deleteEngagement = async () => {
    if (!confirm(`Delete "${engagement?.name}"? This permanently removes all workpapers, findings and evidence. This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/engagements/${id}`, { method: 'DELETE', headers: actorHeaders })
      if (res.ok) { window.location.href = '/dashboard' }
      else { const d = await res.json(); alert(d.error) }
    } finally { setDeleting(false) }
  }

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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const updateFindingStatus = async (findingId:string, action:string, extra?:object) => {
    await fetch(`/api/findings/${findingId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json",...actorHeaders},
      body:JSON.stringify({action,...extra}),
    })
    fetchAll()
  }

  const runContradictionCheck = async () => {
    setCheckingContradictions(true)
    try {
      const res = await fetch(`/api/engagements/${id}/contradiction-check`)
      if (res.ok) { const d = await res.json(); setContradictions(d.contradictions); setContradictionSummary(d.summary); setActiveTab("analytics") }
    } finally { setCheckingContradictions(false) }
  }

  const generateAISummary = async () => {
    setGeneratingSummary(true); setShowAISummary(true)
    try {
      const res = await fetch(`/api/engagements/${id}/ai-summary`, { method:"POST", headers:{"Content-Type":"application/json",...actorHeaders} })
      const d = await res.json()
      setAiSummary(res.ok ? d.summary : `Error: ${d.error}`)
    } finally { setGeneratingSummary(false) }
  }

  const checkPriorYear = async () => {
    setCheckingPriorYear(true)
    try {
      const res = await fetch(`/api/engagements/${id}/prior-year`)
      if (res.ok) { setPriorYear(await res.json()); setActiveTab("findings") }
    } finally { setCheckingPriorYear(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
    </div>
  )

  if (!engagement) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-slate-600 mb-4">Engagement not found</p>
        <Link href="/dashboard" className="text-amber-600 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {showBulk && <BulkWorkpaperModal engagementId={id} onClose={()=>setShowBulk(false)} onComplete={()=>{setShowBulk(false);setActiveTab("workpapers");fetchAll()}} />}
      {showImport && <ImportFindingsModal engagementId={id} onClose={()=>setShowImport(false)} onComplete={()=>{setShowImport(false);setActiveTab("findings");fetchAll()}} />}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">Dashboard</Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{engagement.name}</h1>
                <p className="text-sm text-slate-500">{engagement.frameworks?.join(" · ")} · {engagement.period_start} to {engagement.period_end}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Link href={`/engagements/${id}/scope`} className="px-3 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">Scope</Link>
              <Link href={`/engagements/${id}/pbc`} className="px-3 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition">PBC</Link>
              <Link href="/cross-framework" className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition">Map</Link>
              <button onClick={()=>setShowBulk(true)} className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition">Bulk</button>
              <button onClick={checkPriorYear} disabled={checkingPriorYear} className="px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition">{checkingPriorYear?"Checking...":"Prior Year"}</button>
              <button onClick={runContradictionCheck} disabled={checkingContradictions} className="px-3 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 transition">{checkingContradictions?"Checking...":"Quality"}</button>
              <button onClick={generateAISummary} disabled={generatingSummary} className="px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition">{generatingSummary?"Drafting...":"AI Summary"}</button>
              <a href={`/api/engagements/${id}/export`} download className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">Export</a>
              <button onClick={()=>setShowImport(true)} className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition">Import</button>
              <Link href={`/engagements/${id}/workpapers/new`} className="px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition">+ Workpaper</Link>
              <Link href={`/engagements/${id}/findings/new`} className="px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition">+ Finding</Link>
              {actor?.role === 'admin' && (
                <>
                  <button onClick={startEdit} className="px-3 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition">✏️ Edit</button>
                  <button onClick={deleteEngagement} disabled={deleting} className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition">{deleting ? '...' : '🗑 Delete'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-4 gap-6 text-center">
            {[
              {label:"Workpapers", value:workpapers.length, color:"text-slate-900"},
              {label:"Signed Off", value:workpapers.filter(w=>w.signed_off_at).length, color:"text-green-600"},
              {label:"Open Findings", value:findings.filter(f=>f.status==="open").length, color:"text-red-600"},
              {label:"Critical", value:findings.filter(f=>f.severity==="critical").length, color:"text-red-700"},
            ].map(s => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-4 border-b border-slate-200 mt-6 mb-6">
          {([
            {key:"workpapers", label:`Workpapers (${workpapers.length})`},
            {key:"findings",   label:`Findings (${findings.length})`},
            {key:"analytics",  label:"Analytics"},
          ] as {key:Tab;label:string}[]).map(t => (
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${activeTab===t.key?"border-amber-500 text-amber-600":"border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "workpapers" && (
          <div className="space-y-3 pb-10">
            {workpapers.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500 mb-4">No workpapers yet</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>setShowBulk(true)} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">Bulk Create</button>
                  <Link href={`/engagements/${id}/workpapers/new`} className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600">Add Manually</Link>
                </div>
              </div>
            ) : workpapers.map(wp => (
              <Link key={wp.id} href={`/workpapers/${wp.id}`} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-5 hover:border-amber-400 hover:shadow transition">
                <div>
                  <p className="font-semibold text-slate-900">{wp.control_id}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Version {wp.version}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {wp.test_result && <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[wp.test_result]||"bg-slate-100 text-slate-600"}`}>{wp.test_result}</span>}
                  {wp.signed_off_at && <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">Signed</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "findings" && (
          <div className="space-y-3 pb-10">
            {priorYear && priorYear.summary?.repeats > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="font-bold text-orange-900 text-sm mb-2">Repeat Findings: {priorYear.summary.repeats} of {priorYear.summary.total} ({priorYear.summary.repeatRate}%)</p>
                {priorYear.repeats.filter((r:any)=>r.isRepeat).map((r:any) => (
                  <p key={r.current.id} className="text-xs text-slate-700">REPEAT: {r.current.title} — failed in {r.priorYears?.join(", ")}</p>
                ))}
              </div>
            )}
            {findings.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-500 mb-4">No findings yet</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>setShowImport(true)} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">Import from Excel</button>
                  <Link href={`/engagements/${id}/findings/new`} className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">Add Manually</Link>
                </div>
              </div>
            ) : findings.map(f => (
              <div key={f.id} className="bg-white rounded-lg border border-slate-200 p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{f.title}</p>
                    {f.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{f.description}</p>}
                  </div>
                  <div className="flex gap-2 ml-4 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[f.severity]||"bg-slate-100"}`}>{f.severity}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[f.status]||"bg-slate-100"}`}>{f.status}</span>
                    {f.status==="open" && <button onClick={()=>updateFindingStatus(f.id,"management_response",{management_response:"agreed"})} className="text-xs px-2 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">Accept</button>}
                    {f.status==="in-progress" && <button onClick={()=>updateFindingStatus(f.id,"remediate")} className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Remediated</button>}
                    {f.status==="remediated" && <button onClick={()=>updateFindingStatus(f.id,"retest",{retest_result:"passed"})} className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Close</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="pb-10 space-y-6">
            {showAISummary && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-violet-900">AI Executive Summary</h3>
                  <button onClick={()=>setShowAISummary(false)} className="text-violet-400 hover:text-violet-600 text-xl">x</button>
                </div>
                {generatingSummary ? (
                  <div className="flex items-center gap-2 text-violet-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-600 border-t-transparent" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiSummary.split("## ").filter(Boolean).map((section,i) => {
                      const [title,...lines] = section.split("\n")
                      return (
                        <div key={i}>
                          <h4 className="font-bold text-slate-900 mb-1">{title.trim()}</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{lines.join("\n").trim()}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-violet-400 mt-3">AI-generated — review before presenting</p>
              </div>
            )}
            {contradictionSummary && (
              <div className={`rounded-xl border p-5 ${contradictionSummary.errors>0?"border-red-300 bg-red-50":contradictionSummary.warnings>0?"border-amber-300 bg-amber-50":"border-green-300 bg-green-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold ${contradictionSummary.errors>0?"text-red-900":contradictionSummary.warnings>0?"text-amber-900":"text-green-900"}`}>
                    {contradictionSummary.errors>0?"Quality Issues Found":contradictionSummary.warnings>0?"Warnings Found":"No Contradictions"}
                  </h3>
                  <div className="flex gap-3 text-xs">
                    <span className="text-red-700 font-medium">{contradictionSummary.errors} errors</span>
                    <span className="text-amber-700 font-medium">{contradictionSummary.warnings} warnings</span>
                    <span className="text-green-700">{contradictionSummary.clean}/{contradictionSummary.total} clean</span>
                  </div>
                </div>
                {contradictions.length > 0 && (
                  <div className="space-y-2">
                    {contradictions.map((c:any,i:number) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border bg-white ${c.severity==="error"?"border-red-200":"border-amber-200"}`}>
                        <div>
                          <span className="text-xs font-bold text-slate-700">{c.control_id}</span>
                          <p className="text-xs text-slate-600 mt-0.5">{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <AnalyticsDashboard engagementId={id} />
          </div>
        )}
      </div>

      {showEdit && editForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Engagement</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Name</label>
                <input value={editForm.name} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Status</label>
                <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {['planned','active','completed','archived'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Period Start</label>
                  <input type="date" value={editForm.period_start} onChange={e => setEditForm((p: any) => ({ ...p, period_start: e.target.value }))}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Period End</label>
                  <input type="date" value={editForm.period_end} onChange={e => setEditForm((p: any) => ({ ...p, period_end: e.target.value }))}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} disabled={editSaving}
                  className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setShowEdit(false)}
                  className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}