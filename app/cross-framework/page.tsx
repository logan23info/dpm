'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import controls from '@/lib/controls'

const ALL_CONTROLS = controls.all()
const FRAMEWORKS = controls.frameworks()

const FW_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  GDPR:     { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200',  dot: 'bg-blue-500'   },
  DPDP:     { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-200', dot: 'bg-green-500'  },
  ISO27701: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200',dot: 'bg-purple-500' },
  NISTPF:   { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200', dot: 'bg-amber-500'  },
  SOC2:     { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200', dot: 'bg-slate-400'  },
}

const FW_LABELS: Record<string, string> = {
  GDPR:     'GDPR',
  DPDP:     'DPDP Act 2023',
  ISO27701: 'ISO 27701',
  NISTPF:   'NIST PF',
  SOC2:     'SOC 2',
}

// Build a unified coverage index:
// For each (domain, framework) pair, which controls exist?
function buildCoverageMatrix() {
  const domains = controls.domains()
  const matrix: Record<string, Record<string, {
    id: string; clause_ref: string; control_objective: string;
    key_control: boolean; inherent_risk: string
  }[]>> = {}

  for (const domain of domains) {
    matrix[domain] = {}
    for (const fw of FRAMEWORKS) {
      matrix[domain][fw] = []
    }
    const domainControls = controls.byDomain(domain)
    for (const c of domainControls) {
      if (!matrix[domain][c.framework]) matrix[domain][c.framework] = []
      matrix[domain][c.framework].push({
        id: c.id,
        clause_ref: c.clause_ref,
        control_objective: c.control_objective,
        key_control: c.key_control,
        inherent_risk: c.inherent_risk,
      })
    }
  }

  return { domains, matrix }
}

// For a control, find all controls it maps to across frameworks
function getMappedControls(controlId: string) {
  const control = controls.get(controlId)
  if (!control) return []
  return control.cross_framework_refs.map(ref => {
    const mapped = controls.get(ref)
    return mapped
      ? { id: ref, clause_ref: mapped.clause_ref, framework: mapped.framework,
          control_objective: mapped.control_objective }
      : { id: ref, clause_ref: ref, framework: 'Unknown', control_objective: '' }
  })
}

export default function CrossFrameworkPage() {
  const [view, setView] = useState<'matrix' | 'overlap'>('matrix')
  const [selectedDomain, setSelectedDomain] = useState<string>('All')
  const [selectedControl, setSelectedControl] = useState<string | null>(null)
  const [keyOnly, setKeyOnly] = useState(false)

  const { domains, matrix } = useMemo(() => buildCoverageMatrix(), [])

  const filteredDomains = selectedDomain === 'All' ? domains : [selectedDomain]

  // Overlap analysis: controls that satisfy multiple frameworks
  const overlaps = useMemo(() => {
    return ALL_CONTROLS
      .filter(c => c.cross_framework_refs.length > 0)
      .filter(c => !keyOnly || c.key_control)
      .map(c => ({
        control: c,
        mappedTo: getMappedControls(c.id),
        coverageCount: c.cross_framework_refs.length + 1, // +1 for own framework
      }))
      .sort((a, b) => b.coverageCount - a.coverageCount)
  }, [keyOnly])

  const selectedControlData = selectedControl ? controls.get(selectedControl) : null
  const selectedMappings = selectedControl ? getMappedControls(selectedControl) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
                ← Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Cross-Framework Map</h1>
                <p className="text-sm text-slate-500">
                  {ALL_CONTROLS.length} controls across {FRAMEWORKS.length} frameworks — test once, satisfy many
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('matrix')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  view === 'matrix'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Domain Matrix
              </button>
              <button
                onClick={() => setView('overlap')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  view === 'overlap'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Overlap Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Framework legend */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Frameworks:</span>
            {FRAMEWORKS.map(fw => {
              const cfg = FW_COLORS[fw] || FW_COLORS.SOC2
              return (
                <div key={fw} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-slate-600">{FW_LABELS[fw] || fw}</span>
                  <span className="text-xs text-slate-400">({controls.byFramework(fw).length})</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={selectedDomain}
            onChange={e => setSelectedDomain(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="All">All domains</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={keyOnly}
              onChange={e => setKeyOnly(e.target.checked)}
              className="rounded"
            />
            Key controls only
          </label>
        </div>

        {/* ── VIEW 1: DOMAIN MATRIX ──────────────────────────────────────── */}
        {view === 'matrix' && (
          <div className="space-y-4">
            {filteredDomains.map(domain => {
              const domainControls = matrix[domain]
              const hasAny = FRAMEWORKS.some(fw =>
                (domainControls[fw] || []).filter(c => !keyOnly || c.key_control).length > 0
              )
              if (!hasAny) return null

              return (
                <div key={domain} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 px-5 py-3">
                    <h2 className="text-white font-semibold text-sm">{domain}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left px-4 py-2 text-slate-500 font-medium w-1/5">
                            Framework
                          </th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">
                            Controls in this domain
                          </th>
                          <th className="text-right px-4 py-2 text-slate-500 font-medium w-24">
                            Maps to
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {FRAMEWORKS.map(fw => {
                          const fwControls = (domainControls[fw] || [])
                            .filter(c => !keyOnly || c.key_control)
                          if (fwControls.length === 0) return null
                          const cfg = FW_COLORS[fw] || FW_COLORS.SOC2

                          return (
                            <tr key={fw} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                  <span className="font-medium text-slate-700 text-xs">
                                    {FW_LABELS[fw] || fw}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {fwControls.map(c => {
                                    const mappedCount = controls.get(c.id)?.cross_framework_refs.length || 0
                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => setSelectedControl(
                                          selectedControl === c.id ? null : c.id
                                        )}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition ${
                                          selectedControl === c.id
                                            ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ring-current`
                                            : `bg-white ${cfg.border} ${cfg.text} hover:${cfg.bg}`
                                        }`}
                                      >
                                        <span className="font-medium">{c.clause_ref}</span>
                                        {c.key_control && (
                                          <span className="text-xs opacity-60">★</span>
                                        )}
                                        {mappedCount > 0 && (
                                          <span className="text-xs opacity-60">+{mappedCount}</span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs text-slate-400">
                                  {fwControls.reduce((acc, c) =>
                                    acc + (controls.get(c.id)?.cross_framework_refs.length || 0), 0
                                  )} links
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Selected control detail panel */}
                  {selectedControl && controls.get(selectedControl)?.domain === domain && (
                    <div className="border-t border-amber-200 bg-amber-50 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900">{selectedControl}</p>
                          <p className="text-sm text-slate-600">{selectedControlData?.control_objective}</p>
                        </div>
                        <button
                          onClick={() => setSelectedControl(null)}
                          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                        >×</button>
                      </div>

                      {selectedMappings.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                            Maps to {selectedMappings.length} control(s) across frameworks:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedMappings.map(m => {
                              const cfg = FW_COLORS[m.framework] || FW_COLORS.SOC2
                              return (
                                <div key={m.id} className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                    <span className="text-xs font-medium text-slate-500">
                                      {FW_LABELS[m.framework] || m.framework}
                                    </span>
                                    <span className={`text-xs font-bold ${cfg.text}`}>{m.clause_ref}</span>
                                  </div>
                                  <p className="text-xs text-slate-600">{m.control_objective}</p>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-amber-700 mt-3">
                            ✅ Testing <strong>{selectedControl}</strong> provides evidence for all {selectedMappings.length + 1} controls above.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No cross-framework mappings for this control.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── VIEW 2: OVERLAP ANALYSIS ───────────────────────────────────── */}
        {view === 'overlap' && (
          <div className="space-y-4">
            {/* Summary stat */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {overlaps.filter(o => o.coverageCount >= 3).length}
                </p>
                <p className="text-sm text-slate-500 mt-1">Controls covering 3+ frameworks</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(
                    overlaps.reduce((acc, o) => acc + o.coverageCount, 0) / Math.max(overlaps.length, 1)
                  )}
                </p>
                <p className="text-sm text-slate-500 mt-1">Avg frameworks per control</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {overlaps.filter(o => o.control.key_control && o.coverageCount >= 2).length}
                </p>
                <p className="text-sm text-slate-500 mt-1">Key controls with overlap</p>
              </div>
            </div>

            {/* Overlap list */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">
                  Test-Once, Satisfy-Many — {overlaps.length} controls with cross-framework coverage
                </h2>
                <span className="text-slate-400 text-xs">Click a row to see mappings</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Control</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Objective</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Covers</th>
                    <th className="text-center px-5 py-3 text-slate-500 font-medium w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {overlaps.map(({ control: c, mappedTo, coverageCount }) => (
                    <>
                      <tr
                        key={c.id}
                        onClick={() => setSelectedControl(selectedControl === c.id ? null : c.id)}
                        className="border-b border-slate-100 hover:bg-amber-50 cursor-pointer transition"
                      >
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{c.id}</p>
                            <p className="text-xs text-slate-400">{c.clause_ref}</p>
                            <div className="flex gap-1 mt-1">
                              {c.key_control && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Key</span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                c.inherent_risk === 'High' ? 'bg-red-100 text-red-700'
                                : c.inherent_risk === 'Medium' ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}>{c.inherent_risk}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-xs text-slate-600 line-clamp-2">{c.control_objective}</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {/* Own framework */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              (FW_COLORS[c.framework] || FW_COLORS.SOC2).bg
                            } ${(FW_COLORS[c.framework] || FW_COLORS.SOC2).text}`}>
                              {FW_LABELS[c.framework] || c.framework}
                            </span>
                            {/* Mapped frameworks */}
                            {mappedTo.map(m => (
                              <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                (FW_COLORS[m.framework] || FW_COLORS.SOC2).bg
                              } ${(FW_COLORS[m.framework] || FW_COLORS.SOC2).text}`}>
                                {FW_LABELS[m.framework] || m.framework}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-lg font-bold ${
                            coverageCount >= 4 ? 'text-green-600'
                            : coverageCount >= 3 ? 'text-amber-600'
                            : 'text-slate-400'
                          }`}>{coverageCount}</span>
                        </td>
                      </tr>

                      {/* Expanded mapping detail */}
                      {selectedControl === c.id && (
                        <tr key={`${c.id}-detail`} className="bg-amber-50 border-b border-amber-200">
                          <td colSpan={4} className="px-5 py-4">
                            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3">
                              Testing {c.id} ({c.clause_ref}) satisfies these obligations:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {/* Own */}
                              <div className={`rounded-lg border p-3 ${(FW_COLORS[c.framework] || FW_COLORS.SOC2).bg} ${(FW_COLORS[c.framework] || FW_COLORS.SOC2).border}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold">PRIMARY</span>
                                  <span className="text-xs text-slate-500">{FW_LABELS[c.framework] || c.framework}</span>
                                  <span className="text-xs font-bold">{c.clause_ref}</span>
                                </div>
                                <p className="text-xs text-slate-600">{c.control_objective}</p>
                              </div>
                              {/* Mapped */}
                              {mappedTo.map(m => (
                                <div key={m.id} className={`rounded-lg border p-3 ${(FW_COLORS[m.framework] || FW_COLORS.SOC2).bg} ${(FW_COLORS[m.framework] || FW_COLORS.SOC2).border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-slate-500">{FW_LABELS[m.framework] || m.framework}</span>
                                    <span className={`text-xs font-bold ${(FW_COLORS[m.framework] || FW_COLORS.SOC2).text}`}>{m.clause_ref}</span>
                                  </div>
                                  <p className="text-xs text-slate-600">{m.control_objective}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
