import { useEffect, useMemo, useState } from 'react'
import FilterBar from './components/FilterBar.jsx'
import RcmTable from './components/RcmTable.jsx'
import AIDrawer from './components/AIDrawer.jsx'

const FRAMEWORK_FILES = [
  { key: 'ISO27701', path: 'data/iso27701.json' },
  { key: 'GDPR', path: 'data/gdpr.json' },
  { key: 'DPDP', path: 'data/dpdp-act.json' },
  { key: 'NISTPF', path: 'data/nist-privacy.json' },
  { key: 'SOC2', path: 'data/soc2-privacy.json' }
]

export default function App() {
  const [allControls, setAllControls] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selectedFrameworks, setSelectedFrameworks] = useState(FRAMEWORK_FILES.map(f => f.key))
  const [domainFilter, setDomainFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [keyOnly, setKeyOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    Promise.all(
      FRAMEWORK_FILES.map(f =>
        fetch(import.meta.env.BASE_URL + f.path).then(r => {
          if (!r.ok) throw new Error(`${f.path} returned ${r.status}`)
          return r.json()
        })
      )
    )
      .then(results => setAllControls(results.flat()))
      .catch(e => setLoadError(
        `Could not load the control library (${e.message}). Run "node scripts/build-library.js" then "node scripts/sync-data.js".`
      ))
  }, [])

  const domains = useMemo(
    () => [...new Set(allControls.map(c => c.domain))].sort(),
    [allControls]
  )

  const filtered = useMemo(() => allControls.filter(c => {
    if (!selectedFrameworks.includes(c.framework)) return false
    if (domainFilter !== 'All' && c.domain !== domainFilter) return false
    if (riskFilter !== 'All' && c.inherent_risk !== riskFilter) return false
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (keyOnly && !c.key_control) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${c.id} ${c.clause_ref} ${c.domain} ${c.control_objective} ${c.control_description} ${c.risk_addressed}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [allControls, selectedFrameworks, domainFilter, riskFilter, statusFilter, keyOnly, search])

  const stats = useMemo(() => ({
    total: filtered.length,
    key: filtered.filter(c => c.key_control).length,
    highRisk: filtered.filter(c => c.inherent_risk === 'High').length,
    tested: filtered.filter(c => c.test_result && c.test_result !== 'Not Tested').length
  }), [filtered])

  return (
    <div className="app-shell">
      <div className="masthead">
        <div>
          <h1>RCM Studio</h1>
          <div className="tagline">Privacy &amp; data protection control library — multi-framework</div>
        </div>
        <button className="btn secondary" onClick={() => exportToCsv(filtered)} disabled={!filtered.length}>
          Export {filtered.length} controls to CSV
        </button>
      </div>

      {loadError && <div className="banner-error">{loadError}</div>}

      <div className="stat-row">
        <div className="stat"><span className="num">{stats.total}</span><span className="label">Controls in view</span></div>
        <div className="stat"><span className="num">{stats.key}</span><span className="label">Key controls</span></div>
        <div className="stat"><span className="num">{stats.highRisk}</span><span className="label">High inherent risk</span></div>
        <div className="stat"><span className="num">{stats.tested}</span><span className="label">Tested</span></div>
      </div>

      <FilterBar
        frameworks={FRAMEWORK_FILES.map(f => f.key)}
        selectedFrameworks={selectedFrameworks}
        onFrameworkChange={setSelectedFrameworks}
        domains={domains}
        domainFilter={domainFilter}
        onDomainChange={setDomainFilter}
        riskFilter={riskFilter}
        onRiskChange={setRiskFilter}
        keyOnly={keyOnly}
        onKeyOnlyChange={setKeyOnly}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onOpenAI={() => setAiOpen(true)}
      />

      <RcmTable controls={filtered} />

      <p className="footer-note">
        Click any row for the full control, testing approach, and sign-off fields. Selecting more than one
        framework shows overlapping controls together — use the cross-framework mapping in the expanded
        view to avoid testing the same control twice.
      </p>

      <AIDrawer open={aiOpen} onClose={() => setAiOpen(false)} frameworks={FRAMEWORK_FILES.map(f => f.key)} />
    </div>
  )
}

function exportToCsv(controls) {
  // Ordered to match a standard RCM workpaper layout.
  const headers = [
    'id', 'framework', 'clause_ref', 'domain',
    'control_objective', 'control_description', 'risk_addressed',
    'inherent_risk', 'residual_risk', 'key_control',
    'control_type', 'control_nature', 'frequency',
    'test_of_design', 'test_of_effectiveness', 'population_basis', 'sampling_basis',
    'evidence_required', 'itgc_dependency', 'cross_framework_refs',
    'owner', 'status',
    'test_result', 'exceptions_noted', 'conclusion', 'gap_notes',
    'period_covered', 'prepared_by', 'reviewed_by', 'last_reviewed'
  ]
  const cell = v => {
    if (v === null || v === undefined) return '""'
    const s = Array.isArray(v) ? v.join('; ') : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const rows = controls.map(c => headers.map(h => cell(c[h])).join(','))
  // BOM so Excel reads UTF-8 correctly.
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rcm-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
