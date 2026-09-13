"use client"

import { useEffect, useState } from "react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer
} from "recharts"

interface Analytics {
  effectiveness: number
  workpapers: {
    total: number
    effective: number
    ineffective: number
    partial: number
    signedOff: number
  }
  findingsByStatus: { status: string; count: string }[]
  findingsBySeverity: { severity: string; count: string }[]
  riskByDomain: { domain: string; effectiveness: number; total: number }[]
  remediationProgress: { severity: string; open: number; closed: number; percent: number }[]
  smartSummary: {
    effectiveness: number
    openFindings: number
    criticalFindings: number
    overdueFindings: number
    weakestDomain: string
    weakestDomainPct: number
    insights: string[]
    priorities: string[]
  }
}

const COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f97316",
  slate: "#94a3b8",
}

const STATUS_COLORS: Record<string, string> = {
  open: COLORS.red,
  "in-progress": COLORS.amber,
  remediated: COLORS.blue,
  closed: COLORS.green,
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.red,
  high: COLORS.orange,
  medium: COLORS.amber,
  low: COLORS.blue,
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-4xl font-bold ${color || "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsDashboard({ engagementId }: { engagementId: string }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/engagements/${engagementId}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load analytics"); setLoading(false) })
  }, [engagementId])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
    </div>
  )

  if (error || !data) return (
    <div className="text-center py-12 text-slate-500">{error || "No data"}</div>
  )

  const { smartSummary, workpapers, findingsByStatus, findingsBySeverity, riskByDomain, remediationProgress } = data

  const effectivenessColor =
    data.effectiveness >= 80 ? "text-green-600"
    : data.effectiveness >= 60 ? "text-amber-600"
    : "text-red-600"

  return (
    <div className="space-y-6">

      {/* Smart Summary Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">📊 Audit Intelligence Summary</h2>
            <p className="text-slate-400 text-sm">Rule-based insights from your engagement data</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-amber-400">{smartSummary.effectiveness}%</p>
            <p className="text-slate-400 text-xs">Control Effectiveness</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Insights */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Key Insights</p>
            <ul className="space-y-1">
              {smartSummary.insights.map((insight, i) => (
                <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Priorities */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Priority Actions</p>
            {smartSummary.priorities.length > 0 ? (
              <ul className="space-y-1">
                {smartSummary.priorities.map((p, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                    <span className="text-red-400 font-bold">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-400">✅ All priorities addressed</p>
            )}
          </div>
        </div>

        {/* Stat Pills */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700">
          {[
            { label: "Controls", value: workpapers.total },
            { label: "Signed Off", value: workpapers.signedOff },
            { label: "Open Findings", value: smartSummary.openFindings },
            { label: "Overdue", value: smartSummary.overdueFindings },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Effectiveness"
          value={`${data.effectiveness}%`}
          sub={`${workpapers.effective} of ${workpapers.total} controls`}
          color={effectivenessColor}
        />
        <MetricCard
          label="Effective"
          value={workpapers.effective}
          sub="controls passing"
          color="text-green-600"
        />
        <MetricCard
          label="Ineffective"
          value={workpapers.ineffective}
          sub="controls failing"
          color="text-red-600"
        />
        <MetricCard
          label="Critical Findings"
          value={smartSummary.criticalFindings}
          sub="require immediate action"
          color={smartSummary.criticalFindings > 0 ? "text-red-600" : "text-green-600"}
        />
      </div>

      {/* 2x3 Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* [1] Risk Radar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">🎯 Risk by Domain</h3>
          {riskByDomain.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={riskByDomain}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Effectiveness %"
                  dataKey="effectiveness"
                  stroke={COLORS.amber}
                  fill={COLORS.amber}
                  fillOpacity={0.3}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Effectiveness"]} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No workpaper data yet
            </div>
          )}
        </div>

        {/* [2] Finding Status Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">📋 Finding Status</h3>
          {findingsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={findingsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {findingsByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS.slate} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No findings yet
            </div>
          )}
        </div>

        {/* [3] Remediation Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">⚡ Remediation Progress</h3>
          {remediationProgress.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={remediationProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="severity" width={60} tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => [`${v}%`, "Closed"]} />
                <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
                  {remediationProgress.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.severity] || COLORS.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No findings yet
            </div>
          )}
        </div>

        {/* [4] Findings by Severity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">🔴 Findings by Severity</h3>
          {findingsBySeverity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={findingsBySeverity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {findingsBySeverity.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.severity] || COLORS.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No findings yet
            </div>
          )}
        </div>

        {/* [5] Control Effectiveness by Domain Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 md:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">🗺️ Control-Domain Matrix</h3>
          {riskByDomain.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">Domain</th>
                  <th className="text-center py-2 text-slate-500 font-medium">Controls</th>
                  
                  <th className="text-left py-2 text-slate-500 font-medium">Effectiveness</th>
                  <th className="text-center py-2 text-slate-500 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {riskByDomain.map((d, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{d.domain}</td>
                    <td className="py-3 text-center text-slate-600">{d.total}</td>
                    
                    <td className="py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${d.effectiveness}%`,
                              backgroundColor: d.effectiveness >= 80 ? COLORS.green
                                : d.effectiveness >= 60 ? COLORS.amber
                                : COLORS.red,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-10">{d.effectiveness}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      const cls1 = d.effectiveness >= 80 ? "bg-green-100 text-green-800" : d.effectiveness >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800" }
                      <span className={"text-xs px-2 py-1 rounded-full font-medium " + cls1}>
                        {d.effectiveness >= 80 ? "Strong" : d.effectiveness >= 60 ? "Moderate" : "Weak"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Add workpapers to see domain matrix
            </div>
          )}
        </div>
      </div>
    </div>
  )
}