'use client'

import { useEffect, useState } from 'react'
import { useActor } from '@/app/components/SessionBanner'

interface Note {
  id: string
  content: string
  author: string
  status: 'open' | 'responded' | 'closed'
  response?: string
  responded_by?: string
  closed_by?: string
  closed_at?: string
  created_at: string
}

interface Props {
  workpaperId: string
  isLocked: boolean
}

const STATUS_CONFIG = {
  open:      { label: 'Open',      color: 'bg-red-100 text-red-800',    icon: '⚠️' },
  responded: { label: 'Responded', color: 'bg-amber-100 text-amber-800', icon: '💬' },
  closed:    { label: 'Cleared',   color: 'bg-green-100 text-green-800', icon: '✅' },
}

export default function ReviewNotesPanel({ workpaperId, isLocked }: Props) {
  const { actor, actorHeaders } = useActor()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [response, setResponse] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const openCount = notes.filter(n => n.status === 'open').length

  useEffect(() => { fetchNotes() }, [workpaperId])

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/comments?workpaper_id=${workpaperId}`)
      if (res.ok) setNotes(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const raiseNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actorHeaders },
        body: JSON.stringify({ workpaper_id: workpaperId, content: newNote }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(p => [...p, note])
        setNewNote('')
      }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const act = async (id: string, action: string, extra?: Record<string, string>) => {
    const res = await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...actorHeaders },
      body: JSON.stringify({ id, action, ...extra }),
    })
    if (res.ok) {
      const updated = await res.json()
      setNotes(p => p.map(n => n.id === id ? updated : n))
      setResponse(p => ({ ...p, [id]: '' }))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">Review Notes</h3>
          {openCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-medium">
              {openCount} open — blocks sign-off
            </span>
          )}
          {openCount === 0 && notes.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
              All cleared ✅
            </span>
          )}
        </div>
      </div>

      {/* Raise new note — reviewer only */}
      {!isLocked && actor?.role === 'reviewer' && (
        <div className="mb-4 space-y-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={2}
            placeholder="Raise a review note for the preparer..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={raiseNote}
            disabled={saving || !newNote.trim()}
            className="px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
          >
            {saving ? 'Raising...' : '⚠️ Raise Note'}
          </button>
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-2xl mb-2">📝</p>
          <p className="text-sm">No review notes yet</p>
          {actor?.role === 'reviewer' && !isLocked && (
            <p className="text-xs mt-1">Raise a note above to flag issues for the preparer</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const cfg = STATUS_CONFIG[note.status]
            const cls = note.status === 'open' ? 'border-red-200 bg-red-50' : note.status === 'responded' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
            return (
              <div
                key={note.id}
                className={"rounded-lg border p-4 " + cls}
              >
                {/* Note header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      Raised by {note.author} · {new Date(note.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  {/* Reviewer can reopen a closed note */}
                  {note.status === 'closed' && actor?.role === 'reviewer' && !isLocked && (
                    <button
                      onClick={() => act(note.id, 'reopen')}
                      className="text-xs text-slate-400 hover:text-amber-600 transition"
                    >
                      Reopen
                    </button>
                  )}
                </div>

                {/* Note content */}
                <p className="text-sm text-slate-800 mb-2">{note.content}</p>

                {/* Response */}
                {note.response && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3 mt-2">
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Response by {note.responded_by}
                    </p>
                    <p className="text-sm text-slate-700">{note.response}</p>
                  </div>
                )}

                {/* Preparer responds to open note */}
                {note.status === 'open' && actor?.role === 'preparer' && !isLocked && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={response[note.id] || ''}
                      onChange={e => setResponse(p => ({ ...p, [note.id]: e.target.value }))}
                      rows={2}
                      placeholder="Respond to this note..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => act(note.id, 'respond', { response: response[note.id] || '' })}
                      disabled={!response[note.id]?.trim()}
                      className="px-3 py-1.5 bg-white border border-amber-500 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 disabled:opacity-50 transition"
                    >
                      Submit Response
                    </button>
                  </div>
                )}

                {/* Reviewer closes responded note */}
                {note.status === 'responded' && actor?.role === 'reviewer' && !isLocked && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => act(note.id, 'close')}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      ✅ Clear Note
                    </button>
                    <button
                      onClick={() => act(note.id, 'reopen')}
                      className="px-3 py-1.5 border border-red-300 text-red-700 text-xs font-medium rounded-lg hover:bg-red-50 transition"
                    >
                      Reopen
                    </button>
                  </div>
                )}

                {/* Closed by */}
                {note.status === 'closed' && note.closed_by && (
                  <p className="text-xs text-green-700 mt-2">
                    Cleared by {note.closed_by} · {note.closed_at ? new Date(note.closed_at).toLocaleDateString('en-GB') : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}