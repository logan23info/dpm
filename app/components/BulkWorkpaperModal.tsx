'use client'

import { useState } from 'react'
import controls from '@/lib/controls'
import { useActor } from '@/app/components/SessionBanner'

const FRAMEWORKS = controls.frameworks()
const FW_LABELS: Record<string, string> = {
  GDPR: 'GDPR', DPDP: 'DPDP Act 2023',
  ISO27701: 'ISO 27701', NISTPF: 'NIST Privacy Framework', SOC2: 'SOC 2',
}

interface Result { created: number; skipped: number; errors: number; total: number }
interface Props { engagementId: string; onComplete: () => void; onClose: () => void }

export default function BulkWorkpaperModal({ engagementId, onComplete, onClose }: Props) {
  const { actorHeaders } = useActor()
  const [framework, setFramework] = useState('GDPR')
  const [keyOnly, setKeyOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const previewControls = keyOnly ? controls.keyControls(framework) : controls.byFramework(framework)
  const previewCount = previewControls.length

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/engagements/${engagementId}/bulk-workpapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ framework, keyOnly }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setResult(data)
    } catch (e: any) {
      setError('Network error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <p className="font-bold text-green-900 mb-3">Workpapers Created</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-slate-500">Created</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-2xl font-bold text-slate-500">{result.skipped}</p>
                <p className="text-xs text-slate-500">Skipped</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <p className="text-2xl font-bold text-red-500">{result.errors}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onComplete} className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 transition">
              View Workpapers
            </button>
            <button onClick={() => setResult(null)} className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
              Create More
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="bg-amber-600 rounded-t-xl px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-white font-bold text-lg">Bulk Create Workpapers</h2>
            <p className="text-white/70 text-sm">Generate workpapers for an entire framework at once</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Framework</label>
            <div className="grid grid-cols-2 gap-2">
              {FRAMEWORKS.map(fw => (
                <button key={fw} type="button" onClick={() => setFramework(fw)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition ${framework === fw ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-amber-400'}`}
                >
                  <div>{FW_LABELS[fw] || fw}</div>
                  <div className={`text-xs mt-0.5 ${framework === fw ? 'text-white/70' : 'text-slate-400'}`}>
                    {controls.byFramework(fw).length} controls &middot; {controls.keyControls(fw).length} key
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Key controls only</p>
              <p className="text-xs text-slate-500 mt-0.5">Recommended &mdash; focuses on highest risk</p>
            </div>
            <button onClick={() => setKeyOnly(!keyOnly)}
              className={`w-12 h-6 rounded-full transition-colors ${keyOnly ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${keyOnly ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Preview: {previewCount} workpapers</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {previewControls.map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{c.id}</span>
                  <span className="text-slate-500">{c.clause_ref}</span>
                  <div className="flex gap-1">
                    {c.key_control && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Key</span>}
                    <span className={`px-1.5 py-0.5 rounded ${c.inherent_risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{c.inherent_risk}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">Controls already in this engagement will be skipped.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={loading || previewCount === 0}
              className="flex-1 bg-amber-600 text-white font-medium py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
              {loading ? `Creating ${previewCount}...` : `Create ${previewCount} Workpapers`}
            </button>
            <button onClick={onClose} className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}