'use client'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'

const ROLE_COLORS: Record<string,string> = {
  preparer:'bg-blue-100 text-blue-800', reviewer:'bg-amber-100 text-amber-800',
  admin:'bg-purple-100 text-purple-800', viewer:'bg-slate-100 text-slate-600',
}

export default function SessionBanner() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  if (isPending) return <div className="w-32 h-6 bg-slate-700 rounded animate-pulse" />
  if (!session?.user) return null
  const user = session.user as any
  const role = user.role || 'preparer'
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[role]||''}`}>{role}</span>
      <span className="text-sm text-slate-200 font-medium">{user.name || user.email}</span>
      <button onClick={async()=>{ await signOut(); router.push('/sign-in') }}
        className="text-xs text-slate-400 hover:text-white transition">Sign out</button>
    </div>
  )
}

export function useActor() {
  const { data: session } = useSession()
  const user = session?.user as any
  const actor = session?.user ? {
    id: session.user.id,
    name: session.user.name || session.user.email || 'Unknown',
    role: (user?.role || 'preparer') as 'preparer'|'reviewer'|'admin'|'viewer',
  } : null
  const actorHeaders: Record<string,string> = actor
    ? { 'x-actor-name': actor.name, 'x-actor-role': actor.role, 'x-actor-id': actor.id||'' }
    : {}
  return { actor, actorHeaders }
}
