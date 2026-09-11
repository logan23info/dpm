import React, { useState } from 'react'

const statusClass = s => 'status-' + s.toLowerCase().replace(/\s+/g, '-')
const riskClass = r => 'risk-' + String(r).toLowerCase()

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      <p>{children || '—'}</p>
    </div>
  )
}

export default function RcmTable({ controls }) {
  const [expandedId, setExpandedId] = useState(null)

  if (controls.length === 0) {
    return <p className="empty-state">No controls match the current filters. Widen the framework or domain selection.</p>
  }

  return (
    <table className="rcm-table">
      <thead>
        <tr>
          <th>Control ID</th>
          <th>Fw</th>
          <th>Domain</th>
          <th>Control objective</th>
          <th>Risk</th>
          <th>Key</th>
          <th>Freq</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {controls.map(c => (
          <React.Fragment key={c.id}>
            <tr onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} className="row-clickable">
              <td className="control-id">{c.id}</td>
              <td><span className="badge framework">{c.framework}</span></td>
              <td>{c.domain}</td>
              <td>{c.control_objective}</td>
              <td><span className={`badge ${riskClass(c.inherent_risk)}`}>{c.inherent_risk}</span></td>
              <td>{c.key_control ? <span className="key-dot" title="Key control">●</span> : ''}</td>
              <td className="nowrap">{c.frequency}</td>
              <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
            </tr>
            {expandedId === c.id && (
              <tr className="expand-panel">
                <td colSpan={8}>
                  <div className="panel-section">
                    <h4>Control</h4>
                    <div className="field-grid">
                      <Field label="Clause reference">{c.clause_ref}</Field>
                      <Field label="Control owner">{c.owner}</Field>
                      <Field label="Control description">{c.control_description}</Field>
                      <Field label="Risk addressed">{c.risk_addressed}</Field>
                      <Field label="Type / nature">{`${c.control_type} · ${c.control_nature}`}</Field>
                      <Field label="ITGC dependencies">{(c.itgc_dependency || []).join(', ')}</Field>
                    </div>
                  </div>

                  <div className="panel-section">
                    <h4>Testing approach</h4>
                    <div className="field-grid">
                      <Field label="Test of design">{c.test_of_design}</Field>
                      <Field label="Test of effectiveness">{c.test_of_effectiveness}</Field>
                      <Field label="Population basis">{c.population_basis}</Field>
                      <Field label="Sampling basis">{c.sampling_basis}</Field>
                      <Field label="Evidence required">{c.evidence_required}</Field>
                      <Field label="Cross-framework mapping">{(c.cross_framework_refs || []).join(', ')}</Field>
                    </div>
                  </div>

                  <div className="panel-section">
                    <h4>Results and sign-off</h4>
                    <div className="field-grid">
                      <Field label="Test result">{c.test_result}</Field>
                      <Field label="Residual risk">{c.residual_risk}</Field>
                      <Field label="Exceptions noted">{c.exceptions_noted}</Field>
                      <Field label="Conclusion">{c.conclusion}</Field>
                      <Field label="Period covered">{c.period_covered}</Field>
                      <Field label="Prepared / reviewed by">
                        {c.prepared_by || c.reviewed_by ? `${c.prepared_by || '—'} / ${c.reviewed_by || '—'}` : null}
                      </Field>
                    </div>
                    <p className="panel-note">
                      Results fields are populated during fieldwork. Export to CSV to complete them in your workpaper.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  )
}
