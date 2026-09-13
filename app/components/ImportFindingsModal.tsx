"use client"

import { useState, useRef } from "react"

interface ImportResult {
  success: boolean
  created: number
  skipped: number
  errors: number
  totalRows: number
}

interface Props {
  engagementId: string
  onComplete: () => void
  onClose: () => void
}

export default function ImportFindingsModal({ engagementId, onComplete, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload an .xlsx, .xls, or .csv file")
      return
    }
    setFile(f)
    setError("")
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/engagements/${engagementId}/import-findings`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import failed")
        return
      }

      setResult(data)
    } catch (e) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="bg-amber-600 rounded-t-xl px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-white font-bold text-lg">Import Findings from Assessment</h2>
            <p className="text-white/70 text-sm">Upload .xlsx, .xls, or .csv</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Expected Format */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">📋 Expected Columns (flexible detection):</p>
            <div className="grid grid-cols-2 gap-1 text-blue-700">
              <span>• Control ID / Reference</span>
              <span>• Test Result / Status</span>
              <span>• Finding / Gap / Issue</span>
              <span>• Owner (optional)</span>
            </div>
            <p className="text-blue-600 text-xs mt-2">
              Findings auto-created for: Ineffective, Non-Compliant, Partial, Fail, Gap
            </p>
          </div>

          {/* Upload Area */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                dragging ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-amber-600 mt-2">Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl mb-3">📊</p>
                  <p className="font-medium text-slate-700">Drag & drop your assessment file</p>
                  <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                  <p className="text-xs text-slate-400 mt-2">.xlsx · .xls · .csv</p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-bold text-green-900 mb-3">✅ Import Complete</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{result.created}</p>
                    <p className="text-xs text-slate-600">Findings Created</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-2xl font-bold text-slate-600">{result.skipped}</p>
                    <p className="text-xs text-slate-600">Skipped</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                    <p className="text-xs text-slate-600">Errors</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {result.totalRows} total rows processed
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {result ? (
              <>
                <button
                  onClick={onComplete}
                  className="flex-1 bg-amber-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-amber-700 transition"
                >
                  View Findings
                </button>
                <button
                  onClick={() => { setResult(null); setFile(null) }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Import Another
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1 bg-amber-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing...</>
                  ) : (
                    "📥 Import Findings"
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    
  )
}