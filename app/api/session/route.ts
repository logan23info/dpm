// app/api/session/route.ts
// Simple named session — stores actor name + role in a cookie.
// Replace this with real auth later without changing anything else.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const name = req.cookies.get('actor_name')?.value
  const role = req.cookies.get('actor_role')?.value

  if (!name) {
    return NextResponse.json({ actor: null })
  }

  return NextResponse.json({
    actor: {
      name,
      role: role || 'preparer',
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, role } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const validRoles = ['preparer', 'reviewer', 'admin', 'viewer']
  const safeRole = validRoles.includes(role) ? role : 'preparer'

  const response = NextResponse.json({
    actor: { name: name.trim(), role: safeRole },
  })

  // 8-hour session
  const maxAge = 60 * 60 * 8
  response.cookies.set('actor_name', name.trim(), { maxAge, path: '/' })
  response.cookies.set('actor_role', safeRole,    { maxAge, path: '/' })

  return response
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ cleared: true })
  response.cookies.delete('actor_name')
  response.cookies.delete('actor_role')
  return response
}
