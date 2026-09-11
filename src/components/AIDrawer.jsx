import { useState } from 'react'

// Point this at your deployed Vercel API, e.g. https://your-project.vercel.app/api/draft-control
// Portal and API share an origin on Vercel, so these are relative paths.
// No base URL and no client-side secret are needed.

export default function AIDrawer({ open, onClose, frameworks }) {
  const [mode, setMode] = useState('draft') // draft | gap
  const [framework, setFramework] = useState(frameworks[0] || '')
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {

    setLoading(true)
    setError('')
    setResult('')
    try {
      const endpoint = mode === 'draft' ? '/api/draft-control' : '/api/gap-check'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework, text: inputText })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`)
      }
      setResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`ai-drawer ${open ? 'open' : ''}`}>
      <h3>AI Control Assistant</h3>
      <div className="controls-bar" style={{ marginBottom: 12 }}>
        <select value={mode} onChange={e => setMode(e.target.value)}>
          <option value="draft">Draft control from clause</option>
          <option value="gap">Gap-check my policy text</option>
        </select>
        <select value={framework} onChange={e => setFramework(e.target.value)}>
          {frameworks.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <textarea
        placeholder={mode === 'draft'
          ? 'Paste the regulatory clause or requirement text here...'
          : 'Paste your existing policy/control text to check for gaps...'}
        value={inputText}
        onChange={e => setInputText(e.target.value)}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="btn" onClick={handleGenerate} disabled={loading || !inputText}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
        <button className="btn secondary" onClick={onClose}>Close</button>
      </div>
      {error && <p style={{ color: 'var(--risk-high)', fontSize: 12 }}>{error}</p>}
      {result && <div className="ai-result">{result}</div>}
      <p className="footer-note">
        AI output is a draft starting point. Review against the source clause and your control
        environment before adding to the RCM.
      </p>
    </div>
  )
}
