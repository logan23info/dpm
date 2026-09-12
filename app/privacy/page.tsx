'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface BreachSummary { open: number; overdue: number; urgent: number }
interface RopaSummary { total: number; dpiaRequired: number }

export default function PrivacyHubPage() {
  const [breachSummary, setBreachSummary] = useState<BreachSummary | null>(null)
  const [ropaSummary, setRopaSummary] = useState<RopaSummary | null>(null)

  useEffect(() => {
    fetch('/api/privacy/breach')
      .then(r => r.json())
      .then(d => setBreachSummary(d.summary))
      .catch(() => {})

    fetch('/api/privacy/ropa')
      .then(r => r.json())
      .then(d => setRopaSummary(d.summary))
      .catch(() => {})
  }, [])

  const tiles = [
    {
      href: '/privacy/breach',
      icon: '🚨',
      title: 'Breach Register',
      subtitle: 'GDPR Art. 33/34 · DPDP Sec 8.6',
      stat: breachSummary
        ? breachSummary.overdue > 0
          ? { value: breachSummary.overdue, label: 'OVERDUE', color: 'text-red-600' }
          : { value: breachSummary.open, label: 'open', color: 'text-amber-600' }
        : null,
      description: '72-hour supervisory authority notification clock, incident logging and tracking.',
      color: 'border-red-200 hover:border-red-400',
      iconBg: 'bg-red-50',
    },
    {
      href: '/privacy/ropa',
      icon: '📋',
      title: 'Record of Processing Activities',
      subtitle: 'GDPR Art. 30 · DPDP Sec 8.7',
      stat: ropaSummary
        ? { value: ropaSummary.total, label: 'activities', color: 'text-blue-600' }
        : null,
      description: 'Maintain your RoPA — purpose, lawful basis, categories, recipients, retention.',
      color: 'border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-50',
    },
    {
      href: '/privacy/processors',
      icon: '🤝',
      title: 'Processor Register',
      subtitle: 'GDPR Art. 28 · DPDP Sec 8.2',
      stat: null,
      description: 'Track Data Processing Agreements, sub-processors, and transfer mechanisms.',
      color: 'border-purple-200 hover:border-purple-400',
      iconBg: 'bg-purple-50',
    },
    {
      href: '/privacy/dpia',
      icon: '🔍',
      title: 'DPIA Register',
      subtitle: 'GDPR Art. 35 · DPDP Sec 10.2',
      stat: ropaSummary && ropaSummary.dpiaRequired > 0
        ? { value: ropaSummary.dpiaRequired, label: 'required', color: 'text-amber-600' }
        : null,
      description: 'Data Protection Impact Assessments — screening, risk identification, sign-off.',
      color: 'border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-50',
    },
    {
      href: '/cross-framework',
      icon: '🗺️',
      title: 'Cross-Framework Map',
      subtitle: 'GDPR · DPDP · ISO 27701 · NIST · SOC 2',
      stat: null,
      description: 'See how controls map across frameworks — test once, satisfy many obligations.',
      color: 'border-slate-200 hover:border-slate-400',
      iconBg: 'bg-slate-50',
    },
    {
      href: '/dashboard',
      icon: '📊',
      title: 'Audit Dashboard',
      subtitle: 'RCM · Workpapers · Findings',
      stat: null,
      description: 'Manage audit engagements, workpapers, evidence, and findings.',
      color: 'border-green-200 hover:border-green-400',
      iconBg: 'bg-green-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Privacy Hub</h1>
          <p className="text-slate-500 mt-1">
            Privacy programme operations — the compliance evidence base for your audits
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(tile => (
            <Link key={tile.href} href={tile.href}
              className={`bg-white rounded-xl border-2 p-6 transition block group ${tile.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${tile.iconBg} flex items-center justify-center text-2xl`}>
                  {tile.icon}
                </div>
                {tile.stat && (
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${tile.stat.color}`}>{tile.stat.value}</p>
                    <p className="text-xs text-slate-400">{tile.stat.label}</p>
                  </div>
                )}
              </div>
              <h2 className="font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition">
                {tile.title}
              </h2>
              <p className="text-xs text-slate-400 mb-2">{tile.subtitle}</p>
              <p className="text-sm text-slate-600">{tile.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
