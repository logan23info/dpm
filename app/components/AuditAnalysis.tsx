'use client'

import { useState, useEffect } from 'react'
import { useActor } from '@/app/components/SessionBanner'

interface ControlInfo {
  id: string
  clause_ref: string
  domain: string
  framework: string
  control_objective: string
  inherent_risk: string
  key_control: boolean
  evidence_required: string
  sampling_basis: string
  cross_framework_refs: string[]
  authority_url: string
  authority_citation: string
}

interface SavedAnalysis {
  id: string
  mode: string
  analysis: string
  model: string
  disposition?: string
  modified_text?: string
  auditor_note?: string
  dispositioned_by?: string
  dispositioned_at?: string
  created_at: string
}

interface Props {
  controlId: string
  controlName: string
  workpaperId: string
  testResult?: string
  implementationStatus?: string
  exceptions?: string
  isLocked?: boolean
}

const MODE_CONFIG = {
  advisory: {
    label:    'Advisory',
    subtitle: 'DPO / Compliance Guidance',
    icon:     '💡',
    btnBg:    'bg-blue-600 hover:bg-blue-700',
    badgeBg:  'bg-blue-100 text-blue-800',
    headerBg: 'bg-blue-600',
  },
  assurance: {
    label:    'Assurance',
    subtitle: 'IT Auditor / Formal Opinion',
    icon:     '🔍',
    btnBg:    'bg-amber-600 hover:bg-amber-700',
    badgeBg:  'bg-amber-100 text-amber-800',
    headerBg: 'bg-amber-600',
  },
}

const DISPOSITION_CONFIG = {
  accepted: { label: 'Accepted as drafted',     color: 'bg-green-100 text-green-800',  icon: '✅' },
  modified: { label: 'Accepted with changes',   color: 'bg-amber-100 text-amber-800',  icon: '✏️' },
  rejected: { label: 'Rejected',                color: 'bg-red-100 text-red-800',      icon: '❌' },
}

function ParsedAnalysis({ text }: { text: string }) {
  const sections = text.split(/##\s+/).filter(Boolean)
  if (sections.length <= 1) {
    return <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</div>
  }
  const sectionColors: Record<string, string> = {
    'Test of Design': 'bg-purple-50 border-purple-200',
    'Test of Effectiveness': 'bg-green-50 border-green-200',
    'Test of Implementation': 'bg-orange-50 border-orange-200',
    TOD: 'bg-purple-50 border-purple-200',
    TOE: 'bg-green-50 border-green-200',
    TOI: 'bg-orange-50 border-orange-200',
  }
  const sectionIcons: Record<string, string> = {
    'Test of Design': '🎯', 'Test of Effectiveness': '⚡',
    'Test of Implementation': '🔧', TOD: '🎯', TOE: '⚡', TOI: '🔧',
  }
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const lines = section.split('\n')
        const title = lines[0].trim()
        const content = lines.slice(1).join('\n').trim()
        const colorKey = Object.keys(sectionColors).find(k => title.includes(k))
        const colorClass = colorKey ? sectionColors[colorKey] : 'bg-slate-50 border-slate-200'
        const icon = colorKey ? sectionIcons[colorKey] : '📋'
        return (
          <div key={idx} className={`rounded-lg border p-4 ${colorClass}`}>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span>{icon}</span><span>{title}</span>
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {content.split(/\*\*(.*?)\*\*/).map((part, i) =>
                i % 2 === 1
                  ? <strong key={i} className="font-semibold text-slate-900">{part}</strong>
                  : <span key={i}>{part}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AuditAnalysis({
  controlId, controlName, workpaperId,
  testResult, implementationStatus, exceptions, isLocked = false,
}: Props) {
  const { actor, actorHeaders } = useActor()
  const [mode, setMode] = useState<'advisory' | 'assurance'>('advisory')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])

  // Disposition state
  const [showDisposition, setShowDisposition] = useState(false)
  const [disposition, setDisposition] = useState<'accepted' | 'modified' | 'rejected' | null>(null)
  const [modifiedText, setModifiedText] = useState('')
  const [auditorNote, setAuditorNote] = useState('')
  const [dispositionSaving, setDispositionSaving] = useState(false)

  // Load prior saved analyses for this workpaper
  useEffect(() => {
    if (!workpaperId) return
    fetch(`/api/ai/analyses?workpaper_id=${workpaperId}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setSavedAnalyses(d) : null)
      .catch(() => {})
  }, [workpaperId])

  const runAnalysis = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setShowDisposition(false)
    setDisposition(null)

    try {
      const res = await fetch('/api/ai/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({
          controlId, workpaperId, testResult, implementationStatus, exceptions, mode,
          actorName: actor?.name,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Analysis failed')
        return
      }
      const data = await res.json()
      setResult(data)
      setModifiedText(data.analysis)
      setShowDisposition(true)
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitDisposition = async () => {
    if (!disposition || !result?.id) return
    setDispositionSaving(true)
    try {
      const res = await fetch('/api/ai/analyse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({
          id: result.id,
          disposition,
          modifiedText: disposition === 'modified' ? modifiedText : undefined,
          auditorNote,
          dispositionedBy: actor?.name,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSavedAnalyses(p => [
          { ...result, ...updated, analysis: disposition === 'modified' ? modifiedText : result.analysis },
          ...p,
        ])
        setShowDisposition(false)
        setResult(null)
        setDisposition(null)
        setAuditorNote('')
      }
    } catch (e) { console.error(e) } finally {
      setDispositionSaving(false)
    }
  }

  const cfg = MODE_CONFIG[mode]

  return (
    <div className="space-y-4">

      {/* Prior saved analyses */}
      {savedAnalyses.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">
            📚 Prior Analyses ({savedAnalyses.length})
          </h3>
          <div className="space-y-2">
            {savedAnalyses.map(sa => {
              const dcfg = sa.disposition ? DISPOSITION_CONFIG[sa.disposition as keyof typeof DISPOSITION_CONFIG] : null
              return (
                <div key={sa.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">{sa.mode}</span>
                    <span className="text-xs text-slate-400">{new Date(sa.created_at).toLocaleDateString('en-GB')}</span>
                    {sa.dispositioned_by && (
                      <span className="text-xs text-slate-400">by {sa.dispositioned_by}</span>
                    )}
                  </div>
                  {dcfg ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dcfg.color}`}>
                      {dcfg.icon} {dcfg.label}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">⏳ Awaiting disposition</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analysis panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className={`${cfg.headerBg} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold">AI Audit Analysis</h2>
              <p className="text-white/70 text-sm">TOD · TOE · TOI — Groq / {result?.model || 'gpt-oss-20b'}</p>
            </div>
            {result?.control && (
              <a
                href={result.control.authority_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white text-xs border border-white/30 px-2 py-1 rounded transition"
              >
                {result.control.clause_ref} →
              </a>
            )}
          </div>
        </div>

        {/* Mode selector */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-3">
            {(['advisory', 'assurance'] as const).map(m => {
              const c = MODE_CONFIG[m]
              const isActive = mode === m
              return (
                <button key={m} onClick={() => { setMode(m); setResult(null); setShowDisposition(false) }}
                 const cls1 = isActive ? `${c.btnBg} text-white border-transparent` : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400' }
                  className={"flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition " + cls1}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                  <span className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{c.subtitle}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-5">
          {!result && !showDisposition && (
            <button onClick={runAnalysis} disabled={loading || isLocked}
              className={`w-full ${cfg.btnBg} text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Analysing...</>
              ) : (
                <>{cfg.icon} Run {cfg.label} Analysis (TOD · TOE · TOI)</>
              )}
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              ❌ {error}
            </div>
          )}

          {/* Analysis result + disposition */}
          {result && showDisposition && (
            <div className="space-y-5">
              {/* Authority */}
              {result.control && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Authoritative Source
                  </p>
                  <p className="font-bold text-slate-900 text-sm">{result.control.clause_ref}</p>
                  <p className="text-xs text-slate-600">{result.control.framework} · {result.control.domain}</p>
                  <a href={result.control.authority_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    View official text →
                  </a>
                </div>
              )}

              {/* Analysis content */}
              <div className="rounded-lg border border-slate-200 p-4">
                <ParsedAnalysis text={result.analysis} />
              </div>

              {/* 🔑 DISPOSITION — required before analysis counts */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
                <p className="font-bold text-amber-900 mb-1">
                  ⚠️ Auditor Disposition Required
                </p>
                <p className="text-sm text-amber-800 mb-4">
                  This AI output must be reviewed and dispositioned before it informs any conclusion.
                  Your decision is recorded in the audit trail.
                </p>

                {/* Disposition options */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(['accepted', 'modified', 'rejected'] as const).map(d => {
                    const dc = DISPOSITION_CONFIG[d]
                    return (
                      <button key={d} onClick={() => setDisposition(d)}
                       const cls2 = disposition === d ? `${dc.color} border-current` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400' }
                        className={"p-3 rounded-lg border-2 text-sm font-medium text-center transition " + cls2}
                      >
                        <div className="text-lg mb-1">{dc.icon}</div>
                        <div>{dc.label}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Modified text area */}
                {disposition === 'modified' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-amber-800 mb-1 block">
                      Edit the analysis (your version will be recorded):
                    </label>
                    <textarea
                      value={modifiedText}
                      onChange={e => setModifiedText(e.target.value)}
                      rows={8}
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                )}

                {/* Rejection reason (required) */}
                {disposition === 'rejected' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-amber-800 mb-1 block">
                      Reason for rejection (required — stronger evidence of independent judgement):
                    </label>
                    <textarea
                      value={auditorNote}
                      onChange={e => setAuditorNote(e.target.value)}
                      rows={2}
                      placeholder="e.g. AI guidance does not reflect our sector-specific implementation context..."
                      className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                )}

                {/* Optional note */}
                {disposition && disposition !== 'rejected' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-amber-800 mb-1 block">
                      Auditor note (optional):
                    </label>
                    <input
                      type="text"
                      value={auditorNote}
                      onChange={e => setAuditorNote(e.target.value)}
                      placeholder="Additional context or rationale..."
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={submitDisposition}
                    disabled={
                      !disposition || dispositionSaving ||
                      (disposition === 'rejected' && !auditorNote.trim())
                    }
                    className="flex-1 bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    {dispositionSaving ? 'Recording...' : `Record: ${disposition ? DISPOSITION_CONFIG[disposition].label : 'Select above'}`}
                  </button>
                  <button
                    onClick={() => { setResult(null); setShowDisposition(false) }}
                    className="px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>

                {actor && (
                  <p className="text-xs text-amber-700 mt-3 text-center">
                    Recorded as: {actor.name} ({actor.role}) · {new Date().toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}