// app/api/comments/route.ts
// Review notes — raise, respond, close
// Blocks sign-off while status = 'open'

import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/session'

// GET all notes for a workpaper
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workpaperId = searchParams.get('workpaper_id')

  if (!workpaperId) {
    return NextResponse.json({ error: 'workpaper_id required' }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT id, content, author, note_type, status,
             response, responded_by, closed_by, closed_at, created_at
      FROM comments
      WHERE workpaper_id = ${workpaperId}
        AND note_type = 'review_note'
      ORDER BY created_at ASC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/comments:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST — raise a new review note
export async function POST(req: NextRequest) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { workpaper_id, content } = body

    if (!workpaper_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'workpaper_id and content are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO comments (workpaper_id, content, author, note_type, status, created_at)
      VALUES (${workpaper_id}, ${content.trim()}, ${actor.name}, 'review_note', 'open', NOW())
      RETURNING id, content, author, note_type, status, created_at
    `
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/comments:', error)
    return NextResponse.json({ error: 'Failed to raise note' }, { status: 500 })
  }
}

// PATCH — respond to or close a note
export async function PATCH(req: NextRequest) {
  try {
    const actor = getActor(req)
    const body = await req.json()
    const { id, action, response } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 })
    }

    const noteResult = await sql`SELECT * FROM comments WHERE id = ${id}`
    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (action === 'respond') {
      if (!response?.trim()) {
        return NextResponse.json({ error: 'Response text is required' }, { status: 400 })
      }
      const result = await sql`
        UPDATE comments SET
          response = ${response.trim()},
          responded_by = ${actor.name},
          status = 'responded'
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'close') {
      const result = await sql`
        UPDATE comments SET
          closed_by = ${actor.name},
          closed_at = NOW(),
          status = 'closed'
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    if (action === 'reopen') {
      const result = await sql`
        UPDATE comments SET
          closed_by = NULL,
          closed_at = NULL,
          status = 'open'
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result.rows[0])
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/comments:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}
