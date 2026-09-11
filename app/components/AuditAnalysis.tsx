"use client"

import { useState } from "react"

interface GdprRef {
  article: string
  title: string
  url: string
}

interface AnalysisResult {
  analysis: string
  gdprRef: GdprRef | null
  model: string
  mode: string
  controlId: string
  timestamp: string
}

interface Props {
  controlId: string
  controlName: string
  testResult?: string
  implementationStatus?: string
  exceptions?: string
}

const MODE_CONFIG = {
  advisory: {
    label: "Advisory",
    subtitle: "DPO / Compliance Guidance",
    icon: "💡",
    color: "blue",
    headerBg: "bg-blue-600",
    badgeBg: "bg-blue-100 text-blue-800",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    borderColor: "border-blue-200",
  },
  assurance: {
    label: "Assurance",
    subtitle: "IT Auditor / Formal Opinion",
    icon: "🔍",
    color: "amber",
    headerBg: "bg-amber-600",
    badgeBg: "bg-amber-100 text-amber-800",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
    borderColor: "border-amber-200",
  },
}

function ParsedAnalysis({ text }: { text: string }) {
  const sections = text.split(/##\s+/).filter(Boolean)

  if (sections.length <= 1) {
    return (
      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
        {text}
      </div>
    )
  }

  const sectionColors: Record<string, string> = {
    "Test of Design": "bg-purple-50 border-purple-200",
    "Test of Effectiveness": "bg-green-50 border-green-200",
    "Test of Implementation": "bg-orange-50 border-orange-200",
    "TOD": "bg-purple-50 border-purple-200",
    "TOE": "bg-green-50 border-green-200",
    "TOI": "bg-orange-50 border-orange-200",
  }

  const sectionIcons: Record<string, string> = {
    "Test of Design": "🎯",
    "Test of Effectiveness": "⚡",
    "Test of Implementation": "🔧",
    "TOD": "🎯",
    "TOE": "⚡",
    "TOI": "🔧",
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const lines = section.split("\n")
        const title = lines[0].trim()
        const content = lines.slice(1).join("\n").trim()

        const colorKey = Object.keys(sectionColors).find(k => title.includes(k))
        const colorClass = colorKey ? sectionColors[colorKey] : "bg-slate-50 border-slate-200"
        const icon = colorKey ? sectionIcons[colorKey] : "📋"

        return (
          <div key={idx} className={`rounded-lg border p-4 ${colorClass}`}>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span>{icon}</span>
              <span>{title}</span>
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {content
                .split(/\*\*(.*?)\*\*/)
                .map((part, i) =>
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
  controlId,
  controlName,
  testResult,
  implementationStatus,
  exceptions,
}: Props) {
  const [mode, setMode] = useState<"advisory" | "assurance">("advisory")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  const runAnalysis = async () => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/ai/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlId,
          controlName,
          testResult,
          implementationStatus,
          exceptions,
          mode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Analysis failed")
        return
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const cfg = MODE_CONFIG[mode]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`${cfg.headerBg} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">
              AI Audit Analysis
            </h2>
            <p className="text-white/80 text-sm">
              TOD · TOE · TOI — Powered by Groq / Llama 3.3
            </p>
          </div>
          <div className="text-white/60 text-xs text-right">
            <p>{controlId}</p>
            <p>GDPR Framework</p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
          Select Analysis Mode
        </p>
        <div className="flex gap-3">
          {(["advisory", "assurance"] as const).map(m => {
            const c = MODE_CONFIG[m]
            const isActive = mode === m
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setResult(null); setError("") }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  isActive
                    ? `${c.buttonBg} text-white border-transparent shadow`
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                <span>{c.icon}</span>
                <div className="text-left">
                  <div>{c.label}</div>
                  <div className={`text-xs ${isActive ? "text-white/70" : "text-slate-400"}`}>
                    {c.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Context Summary */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-slate-500">Control: <span className="font-medium text-slate-700">{controlName}</span></span>
          {implementationStatus && (
            <span className="text-slate-500">Status: <span className="font-medium text-slate-700 capitalize">{implementationStatus}</span></span>
          )}
          {testResult && (
            <span className="text-slate-500">Test Result: <span className="font-medium text-slate-700 capitalize">{testResult}</span></span>
          )}
        </div>
      </div>

      {/* Run Button */}
      <div className="px-6 py-4">
        <button
          onClick={runAnalysis}
          disabled={loading}
          className={`w-full ${cfg.buttonBg} text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Analysing with Groq AI...
            </>
          ) : (
            <>
              {cfg.icon} Run {cfg.label} Analysis (TOD · TOE · TOI)
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="px-6 pb-6 space-y-4">

          {/* GDPR Reference */}
          {result.gdprRef && (
            <div className={`rounded-lg border p-4 ${cfg.borderColor} bg-slate-50`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Authoritative Source — EUR-Lex
                  </p>
                  <p className="font-bold text-slate-900">
                    GDPR {result.gdprRef.article}
                  </p>
                  <p className="text-sm text-slate-600">{result.gdprRef.title}</p>
                </div>
                <a
                  href={result.gdprRef.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                >
                  View EUR-Lex →
                </a>
              </div>
            </div>
          )}

          {/* Mode Badge */}
          <div className="flex items-center justify-between">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${cfg.badgeBg}`}>
              {cfg.icon} {cfg.label} Mode — {cfg.subtitle}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Analysis Content */}
          <div className="rounded-lg border border-slate-200 p-5">
            <ParsedAnalysis text={result.analysis} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
            <span>Model: {result.model}</span>
            <span>⚠️ AI-generated — validate against official GDPR text</span>
          </div>
        </div>
      )}
    </div>
  )
}
