'use client'

import { useState, useEffect } from 'react'

interface Actor {
  name: string
  role: 'preparer' | 'reviewer' | 'admin' | 'viewer'
}

const ROLE_COLORS: Record<string, string> = {
  preparer: 'bg-blue-100 text-blue-800',
  reviewer: 'bg-amber-100 text-amber-800',
  admin:    'bg-purple-100 text-purple-800',
  viewer:   'bg-slate-100 text-slate-600',
}

const ROLE_LABELS: Record<string, string> = {
  preparer: 'Preparer',
  reviewer: 'Reviewer',
  admin:    'Admin',
  viewer:   'Viewer',
}

export default function SessionBanner() {
  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'preparer' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(d => {
        setActor(d.actor)
        if (!d.actor) setShowModal(true)
      })
      .catch(() => setShowModal(true))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setActor(data.actor)
        setShowModal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSwitch = async () => {
    await fetch('/api/session', { method: 'DELETE' })
    setActor(null)
    setForm({ name: '', role: 'preparer' })
    setShowModal(true)
  }

  if (loading) return null

  return (
    <>
      {/* Who-are-you modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="bg-slate-900 rounded-t-xl px-6 py-5">
              <h2 className="text-white font-bold text-lg">Welcome to DPM</h2>
              <p className="text-slate-400 text-sm mt-1">
                Please identify yourself — your name will be recorded on every action.
              </p>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your Role
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="preparer">Preparer — conducts testing, documents workpapers</option>
                  <option value="reviewer">Reviewer — reviews and signs off workpapers</option>
                  <option value="admin">Admin — full access</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠️ Your name will be attached to all actions including workpaper changes,
                sign-offs, review notes, and AI dispositions. This creates an immutable audit record.
              </div>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Session pill in header */}
      {actor && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[actor.role]}`}>
            {ROLE_LABELS[actor.role]}
          </span>
          <span className="text-sm text-slate-700 font-medium">{actor.name}</span>
          <button
            onClick={handleSwitch}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
            title="Switch user"
          >
            ⇄
          </button>
        </div>
      )}
    </>
  )
}

// Hook — use this in client components to get actor for API calls
export function useActor() {
  const [actor, setActor] = useState<Actor | null>(null)

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(d => setActor(d.actor))
      .catch(() => {})
  }, [])

  // Returns headers to attach to every fetch call — always Record<string, string>
  const actorHeaders: Record<string, string> = actor
    ? {
        'x-actor-name': actor.name,
        'x-actor-role': actor.role,
      }
    : {}

  return { actor, actorHeaders }
}
