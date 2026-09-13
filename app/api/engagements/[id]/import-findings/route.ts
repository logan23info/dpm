// app/api/engagements/[id]/import-findings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import * as XLSX from 'xlsx'
import controls from '@/lib/controls'

export const dynamic = 'force-dynamic'

function findColumn(headers: string[], keywords: string[]): string | null {
  return (
    headers.find(h =>
      keywords.some(k =>
        h.toLowerCase().replace(/[\s_-]/g, '').includes(k.toLowerCase())
      )
    ) || null
  )
}

function mapSeverity(testResult: string): string {
  const r = (testResult || '').toLowerCase()
  if (r.includes('critical'))                                  return 'critical'
  if (r.includes('ineffective') || r.includes('fail'))        return 'high'
  if (r.includes('partial') || r.includes('exception'))       return 'medium'
  return 'low'
}

/**
 * Try to match an imported control_id to a library control.
 * Handles fuzzy matching: "GDPR Art32" → "GDPR-Art32", "GDPR-1" → attempts match
 */
function resolveControlId(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/\s+/g, '-').replace(/--+/g, '-')
  // Direct match
  if (controls.get(cleaned)) return cleaned
  // Try with prefix variations
  const variants = [
    cleaned.replace('GDPR-', 'GDPR-Art'),
    cleaned.replace('DPDP-', 'DPDP-Sec'),
    cleaned.replace('ISO-', 'ISO27701-A.'),
  ]
  for (const v of variants) {
    if (controls.get(v)) return v
  }
  return cleaned // return as-is even if not in library
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const engagementId = params.id

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, string>[]

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in spreadsheet' },
        { status: 400 }
      )
    }

    const headers = Object.keys(rows[0])

    const controlCol  = findColumn(headers, ['controlid', 'control', 'id', 'ref', 'clause'])
    const resultCol   = findColumn(headers, ['testresult', 'result', 'status', 'compliance', 'effectiveness'])
    const findingCol  = findColumn(headers, ['finding', 'gap', 'issue', 'observation', 'exception'])
    const titleCol    = findColumn(headers, ['title', 'name', 'description'])
    const dueDateCol  = findColumn(headers, ['duedate', 'targetdate', 'remediationdate', 'due'])

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors:  [] as string[],
    }

    for (const row of rows) {
      const rawControlId = controlCol  ? String(row[controlCol]).trim()  : ''
      const testResult   = resultCol   ? String(row[resultCol]).trim()   : ''
      const findingText  = findingCol  ? String(row[findingCol]).trim()  : ''
      const titleText    = titleCol    ? String(row[titleCol]).trim()    : ''
      const dueDate      = dueDateCol  ? String(row[dueDateCol]).trim()  : ''

      const controlId = resolveControlId(rawControlId)
      const control = controlId ? controls.get(controlId) : null

      // Determine if this row represents an issue
      const isIssue = ['ineffective', 'non-compliant', 'noncompliant',
        'fail', 'gap', 'partial', 'exception', 'critical']
        .some(k => testResult.toLowerCase().includes(k))

      if (!rawControlId && !findingText) {
        results.skipped.push('Row skipped: no control ID or finding text')
        continue
      }

      if (!isIssue && !findingText) {
        results.skipped.push(
          `${rawControlId || 'unknown'}: ${testResult || 'no issue detected'}`
        )
        continue
      }

      // Build title: prefer explicit title, then finding text, then control objective
      const title = titleText
        || findingText.slice(0, 100)
        || (control ? `Gap: ${control.control_objective.slice(0, 80)}` : `Finding: ${rawControlId}`)

      const description = findingText
        || (control
          ? `Control ${controlId} assessed as: ${testResult}. Expected: ${control.control_objective}`
          : `Control ${rawControlId} assessed as: ${testResult}`)

      try {
        const result = await sql`
          INSERT INTO findings (
            engagement_id,
            control_id,
            title,
            severity,
            status,
            description,
            due_date,
            origin
          ) VALUES (
            ${engagementId},
            ${controlId || rawControlId || null},
            ${title},
            ${mapSeverity(testResult)},
            'open',
            ${description},
            ${dueDate || null},
            'excel_import'
          )
          RETURNING id
        `
        results.created.push(result.rows[0].id)
      } catch (err: any) {
        results.errors.push(`${rawControlId}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created:   results.created.length,
      skipped:   results.skipped.length,
      errors:    results.errors.length,
      totalRows: rows.length,
      details:   results,
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}