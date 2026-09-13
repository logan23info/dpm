'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth-client'

const ROLES = [
  { value:'preparer', label:'Preparer — conducts testing, documents workpapers' },
  { value:'reviewer', label:'Reviewer — reviews and signs off workpapers' },
  { value:'admin',    label:'Admin — full platform access' },
  { value:'viewer',   label:'Viewer — read-only access' },
]

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', role:'preparer', department:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}))

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be 8+ characters'); return }
    setLoading(true)
    const { error: err } = await signUp.email({ name:form.name, email:form.email, password:form.password, role:form.role, department:form.department||undefined, callbackURL:'/dashboard' } as any)
    if (err) { setError(err.message || 'Failed to create account'); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">DPM</h1>
          <p className="text-slate-400 text-sm mt-1">Data Protection Management Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Create account</h2>
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <input type="text" required placeholder="Full name" value={form.name} onChange={set('name')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="email" required placeholder="Email" value={form.email} onChange={set('email')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="text" placeholder="Department (optional)" value={form.department} onChange={set('department')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <select value={form.role} onChange={set('role')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input type="password" required placeholder="Password (8+ chars)" value={form.password} onChange={set('password')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="password" required placeholder="Confirm password" value={form.confirm} onChange={set('confirm')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="submit" disabled={loading}
              className="w-full bg-amber-600 text-white font-semibold py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account? <Link href="/sign-in" className="text-amber-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
