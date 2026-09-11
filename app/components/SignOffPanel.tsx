"use client"

import { useState } from "react"

interface Props {
  workpaperId: string
  signedOffAt: string | null
  reviewedBy: string | null
  onUpdate: (data: { signed_off_at: string | null; reviewed_by: string | null }) => void
}

export default function SignOffPanel({ workpaperId, signedOffAt, reviewedBy, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [reviewerName, setReviewerName] = useState(reviewedBy || "")
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")

  const handleSignOff = async () => {
    if (!reviewerName.trim()) { setError("Reviewer name required"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/workpapers/${workpaperId}/signoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signoff", reviewer_name: reviewerName }),
      })
      const data = await res.json()
      if (res.ok) {
        onUpdate({
          signed_off_at: data.workpaper.signed_off_at,
          reviewed_by: data.workpaper.reviewed_by,
        })
        setShowForm(false)
      } else {
        setError(data.error || "Failed to sign off")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleRevert = async () => {
    if (!confirm("Revert sign-off? This will remove the reviewer approval.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workpapers/${workpaperId}/signoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      })
      const data = await res.json()
      if (res.ok) {
        onUpdate({ signed_off_at: null, reviewed_by: null })
        setReviewerName("")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (signedOffAt) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-600 text-xl">✅</span>
              <h3 className="font-semibold text-green-900">Signed Off</h3>
            </div>
            <p className="text-sm text-green-700">
              Reviewed by <strong>{reviewedBy || "Reviewer"}</strong>
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {new Date(signedOffAt).toLocaleDateString("en-GB", {
                day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
          <button
            onClick={handleRevert}
            disabled={loading}
            className="text-xs text-green-700 hover:text-red-600 border border-green-300 hover:border-red-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            Revert
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-amber-900">Reviewer Sign-Off</h3>
          <p className="text-xs text-amber-700 mt-0.5">Pending reviewer approval</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
          >
            ✍️ Sign Off
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-amber-800">Reviewer Name *</label>
            <input
              type="text"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full mt-1 border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ By signing off you confirm:</p>
            <ul className="space-y-0.5 list-disc list-inside text-amber-700">
              <li>You have reviewed all workpaper evidence</li>
              <li>The control assessment is accurate and complete</li>
              <li>All exceptions have been appropriately documented</li>
            </ul>
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSignOff}
              disabled={loading}
              className="flex-1 bg-amber-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {loading ? "Processing..." : "✅ Confirm Sign-Off"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError("") }}
              className="px-4 py-2 border border-amber-300 text-amber-800 text-sm rounded-lg hover:bg-amber-100 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
