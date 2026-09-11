"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (error) {
      console.error(`Sign in with ${provider} failed:`, error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-lg mb-4">
            <span className="text-2xl font-bold text-amber-900">DPM</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Data Protection Management
          </h1>
          <p className="text-slate-600">Sign in to manage audit findings</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-8">
          <div className="space-y-4">
            {/* GitHub Sign In */}
            <button
              onClick={() => handleSignIn("github")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-medium transition-colors"
            >
              <span className="text-xl">🐙</span>
              {isLoading ? "Signing in..." : "Sign in with GitHub"}
            </button>

            {/* Google Sign In */}
            <button
              onClick={() => handleSignIn("google")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-medium transition-colors"
            >
              <span className="text-xl">🔍</span>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-600">
                Secure OAuth authentication
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p>
              <strong>First time?</strong> An account will be created automatically
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>
            Powered by <span className="font-semibold text-slate-900">NextAuth.js</span>
          </p>
        </div>
      </div>
    </div>
  )
}