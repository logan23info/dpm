export default function FilterBar({
  frameworks, selectedFrameworks, onFrameworkChange,
  domains, domainFilter, onDomainChange,
  riskFilter, onRiskChange,
  keyOnly, onKeyOnlyChange,
  search, onSearchChange,
  statusFilter, onStatusChange,
  onOpenAI
}) {
  return (
    <div className="controls-bar">
      <label className="field-inline">
        <span>Framework</span>
        <select
          multiple
          value={selectedFrameworks}
          onChange={(e) => onFrameworkChange(Array.from(e.target.selectedOptions, o => o.value))}
          title="Ctrl/Cmd-click to select multiple frameworks"
        >
          {frameworks.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>

      <select value={domainFilter} onChange={(e) => onDomainChange(e.target.value)}>
        <option value="All">All domains</option>
        {domains.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <select value={riskFilter} onChange={(e) => onRiskChange(e.target.value)}>
        <option value="All">All risk ratings</option>
        <option value="High">High inherent risk</option>
        <option value="Medium">Medium inherent risk</option>
        <option value="Low">Low inherent risk</option>
      </select>

      <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="All">All statuses</option>
        <option value="Not Started">Not Started</option>
        <option value="In Progress">In Progress</option>
        <option value="Implemented">Implemented</option>
        <option value="Not Applicable">Not Applicable</option>
      </select>

      <label className="checkbox-inline">
        <input type="checkbox" checked={keyOnly} onChange={(e) => onKeyOnlyChange(e.target.checked)} />
        Key controls only
      </label>

      <input
        type="text"
        placeholder="Search ID, objective, description..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <button className="btn secondary" onClick={onOpenAI}>Draft control with AI</button>
    </div>
  )
}
