"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
  const { data: session, status } = useSession()
  const router = useRouter()
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchEngagements()
    }
  }, [session])

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

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading engagements...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">RCM Studio</h1>
              <p className="text-slate-600 mt-1">Privacy & Data Protection Audit Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{session?.user?.email}</span>
              <a
                href="/auth/logout"
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick Actions */}
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

          {/* Engagements Grid */}
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {eng.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {eng.frameworks?.join(", ")}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Period:</span>
                      <span className="font-medium text-slate-900">
                        {eng.period_start} to {eng.period_end}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`font-medium capitalize px-2 py-1 rounded text-xs ${
                        eng.status === "closed"
                          ? "bg-green-100 text-green-800"
                          : eng.status === "review"
                          ? "bg-amber-100 text-amber-800"
                          : eng.status === "testing"
                          ? "bg-blue-100 text-blue-800"
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

        {/* Feature Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Phase 1 Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-amber-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Authentication</h3>
                <p className="mt-2 text-sm text-slate-600">
                  GitHub & Google OAuth, role-based access control
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-amber-500 text-white">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Engagements</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Create & manage audit engagements across frameworks
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-slate-300 text-white">
                  ⋯
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Workpaper Versioning</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Auto-versioned workpapers with full audit trail (Phase 1)
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-slate-300 text-white">
                  ⋯
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900">Findings & Evidence</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Coming soon: findings lifecycle & evidence management
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
