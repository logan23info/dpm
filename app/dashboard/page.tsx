"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Engagement {
  id: string
  name: string
  frameworks: string[]
  period_start: string
  period_end: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEngagements()
  }, [])

  const fetchEngagements = async () => {
    try {
      const res = await fetch("/api/engagements")
      if (res.ok) {
        const data = await res.json()
        setEngagements(data)
      }
    } catch (error) {
      console.error("Failed to fetch engagements:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading engagements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">RCM Studio</h1>
              <p className="text-slate-600 mt-1">Privacy & Data Protection Audit Platform</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Engagements</h2>
            <button
              onClick={() => router.push("/engagements/new")}
              className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition"
            >
              + New Engagement
            </button>
          </div>

          {engagements.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-slate-600 mb-4">No engagements yet</p>
              <button
                onClick={() => router.push("/engagements/new")}
                className="inline-block px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600"
              >
                Create your first engagement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {engagements.map((eng) => (
                <Link
                  key={eng.id}
                  href={`/engagements/${eng.id}`}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:border-amber-500 hover:shadow-lg transition cursor-pointer"
                >
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{eng.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{eng.frameworks?.join(", ")}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Period:</span>
                      <span className="font-medium text-slate-900">{eng.period_start} to {eng.period_end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`font-medium capitalize px-2 py-1 rounded text-xs ${
                        eng.status === "closed" ? "bg-green-100 text-green-800"
                        : eng.status === "review" ? "bg-amber-100 text-amber-800"
                        : eng.status === "testing" ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-800"
                      }`}>
                        {eng.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
