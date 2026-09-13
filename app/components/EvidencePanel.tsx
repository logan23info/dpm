"use client"

import { useEffect, useState } from "react"

interface Evidence {
  id: string
  filename: string
  file_type: string
  file_size: number
  url: string
  description: string
  created_at: string
}

interface Props {
  workpaperId: string
}

export default function EvidencePanel({ workpaperId }: Props) {
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ filename: "", url: "", description: "", file_type: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { fetchEvidence() }, [workpaperId])

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`/api/evidence?workpaper_id=${workpaperId}`)
      if (res.ok) setEvidence(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.filename) { setError("Filename required"); return }

    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workpaper_id: workpaperId, ...form }),
      })
      if (res.ok) {
        const newEv = await res.json()
        setEvidence(prev => [newEv, ...prev])
        setForm({ filename: "", url: "", description: "", file_type: "" })
        setShowForm(false)
      } else {
        setError("Failed to save evidence")
      }
    } catch (e) {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this evidence?")) return
    try {
      await fetch(`/api/evidence?id=${id}`, { method: "DELETE" })
      setEvidence(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const FILE_ICONS: Record<string, string> = {
    pdf: "📄", xlsx: "📊", xls: "📊", doc: "📝", docx: "📝",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", csv: "📋", txt: "📃",
  }

  const getIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || ""
    return FILE_ICONS[ext] || "📎"
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          📎 Evidence ({evidence.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
        >
          + Add Evidence
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Document Name *</label>
            <input
              type="text"
              value={form.filename}
              onChange={e => setForm(p => ({ ...p, filename: e.target.value }))}
              placeholder="e.g. Privacy Policy v2.1.pdf"
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Document Type</label>
            <select
              value={form.file_type}
              onChange={e => setForm(p => ({ ...p, file_type: e.target.value }))}
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select type...</option>
              <option value="policy">Policy</option>
              <option value="procedure">Procedure</option>
              <option value="screenshot">Screenshot</option>
              <option value="log">System Log</option>
              <option value="report">Report</option>
              <option value="contract">Contract / DPA</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">URL / Reference</label>
            <input
              type="text"
              value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              placeholder="https://... or SharePoint path"
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="What does this evidence demonstrate?"
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Evidence"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Evidence List */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm">Loading...</div>
      ) : evidence.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-2xl mb-2">📎</p>
          <p className="text-sm">No evidence attached yet</p>
          <p className="text-xs mt-1">Add policies, screenshots, logs, or reports</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map(ev => (
            <div key={ev.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start gap-3">
                <span className="text-xl">{getIcon(ev.filename)}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{ev.filename}</p>
                  {ev.file_type && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">
                      {ev.file_type}
                    </span>
                  )}
                  {ev.description && (
                    <p className="text-xs text-slate-500 mt-1">{ev.description}</p>
                  )}
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                    >
                      Open document →
                    </a>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(ev.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(ev.id)}
                className="text-slate-400 hover:text-red-500 transition text-lg leading-none ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
