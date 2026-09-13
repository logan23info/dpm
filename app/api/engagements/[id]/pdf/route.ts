// app/api/engagements/[id]/pdf/route.ts
// Generates a client-ready PDF audit report
// Uses pdfkit (no browser needed, pure Node.js)

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import controls from '@/lib/controls'

export const dynamic = 'force-dynamic'

const PAGE_W = 595.28  // A4 width in points
const PAGE_H = 841.89  // A4 height in points
const MARGIN = 50

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const PDFDocument = (await import('pdfkit')).default

    // Fetch data
    const [engRes, wpRes, findRes] = await Promise.all([
      sql`SELECT title as name, frameworks, period_start, period_end, status FROM engagements WHERE id = ${params.id}`,
      sql`SELECT control_id, implementation_status, test_result, residual_risk, exceptions_noted, conclusion, signed_off_at FROM workpapers WHERE engagement_id = ${params.id} ORDER BY control_id`,
      sql`SELECT title, severity, status, description, control_id, management_response, agreed_action FROM findings WHERE engagement_id = ${params.id} ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
    ])

    if (engRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const eng  = engRes.rows[0] as any
    const wps  = wpRes.rows as any[]
    const finds = findRes.rows as any[]

    const effective = wps.filter(w => w.test_result === 'effective').length
    const effectiveness = wps.length > 0 ? Math.round((effective / wps.length) * 100) : 0
    const opinion = effectiveness >= 80 ? 'REASONABLE ASSURANCE'
      : effectiveness >= 60 ? 'QUALIFIED OPINION' : 'ADVERSE OPINION'

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: `Audit Report — ${eng.name}`, Author: 'DPM Platform' } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Helper functions
    const W = PAGE_W - MARGIN * 2

    const heading1 = (text: string) => {
      doc.moveDown(0.5).fontSize(16).fillColor('#1e293b').font('Helvetica-Bold').text(text).moveDown(0.3)
    }
    const heading2 = (text: string) => {
      doc.moveDown(0.4).fontSize(11).fillColor('#334155').font('Helvetica-Bold').text(text).moveDown(0.2)
    }
    const body = (text: string) => {
      doc.fontSize(9).fillColor('#475569').font('Helvetica').text(text, { lineGap: 3 })
    }
    const kv = (label: string, value: string) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label}: `, { continued: true })
        .font('Helvetica').fillColor('#1e293b').text(value)
    }
    const rule = () => {
      doc.moveDown(0.3).moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke().moveDown(0.3)
    }

    // ── Cover page ──────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 160).fill('#0f172a')
    doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold')
      .text('AUDIT REPORT', MARGIN, 50, { width: W })
    doc.fontSize(14).fillColor('#94a3b8').font('Helvetica')
      .text(eng.name, MARGIN, 90, { width: W })
    doc.fontSize(10).fillColor('#64748b')
      .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN, 125)

    doc.moveDown(6)

    // Engagement meta
    doc.rect(MARGIN, doc.y, W, 80).fill('#f8fafc').stroke('#e2e8f0')
    const metaY = doc.y + 12
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
    doc.text('FRAMEWORKS', MARGIN + 12, metaY)
    doc.text('PERIOD', MARGIN + 200, metaY)
    doc.text('STATUS', MARGIN + 380, metaY)
    doc.font('Helvetica').fillColor('#1e293b').fontSize(10)
    doc.text(Array.isArray(eng.frameworks) ? eng.frameworks.join(', ') : eng.frameworks, MARGIN + 12, metaY + 16)
    doc.text(`${eng.period_start || '—'} to ${eng.period_end || '—'}`, MARGIN + 200, metaY + 16)
    doc.text(eng.status || '—', MARGIN + 380, metaY + 16)
    doc.moveDown(5)

    // ── Executive Summary ────────────────────────────────────────────────
    heading1('Executive Summary')
    rule()

    // Metrics row
    const metrics = [
      { label: 'Controls Tested', value: String(wps.length) },
      { label: 'Effectiveness', value: `${effectiveness}%` },
      { label: 'Findings', value: String(finds.length) },
      { label: 'Critical', value: String(finds.filter(f => f.severity === 'critical').length) },
    ]
    const colW = W / 4
    metrics.forEach((m, i) => {
      const x = MARGIN + i * colW
      doc.rect(x + 2, doc.y, colW - 4, 50).fill(i % 2 === 0 ? '#f1f5f9' : '#f8fafc').stroke('#e2e8f0')
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(m.value, x + 2, doc.y + 8, { width: colW - 4, align: 'center' })
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(m.label, x + 2, doc.y + 30, { width: colW - 4, align: 'center' })
    })
    doc.moveDown(4.5)

    // Opinion box
    const opColor = effectiveness >= 80 ? '#15803d' : effectiveness >= 60 ? '#b45309' : '#b91c1c'
    const opBg    = effectiveness >= 80 ? '#f0fdf4' : effectiveness >= 60 ? '#fffbeb' : '#fef2f2'
    doc.rect(MARGIN, doc.y, W, 40).fill(opBg).stroke(opColor)
    doc.fontSize(11).font('Helvetica-Bold').fillColor(opColor)
      .text(`Audit Opinion: ${opinion}`, MARGIN + 10, doc.y + 12, { width: W - 20 })
    doc.moveDown(3.5)

    // ── Findings ────────────────────────────────────────────────────────
    if (finds.length > 0) {
      doc.addPage()
      heading1(`Findings & Gap Analysis (${finds.length})`)
      rule()

      for (const f of finds) {
        if (doc.y > PAGE_H - 150) doc.addPage()
        const sevColor = f.severity === 'critical' ? '#dc2626' : f.severity === 'high' ? '#ea580c' : f.severity === 'medium' ? '#d97706' : '#2563eb'
        doc.rect(MARGIN, doc.y, 4, 50).fill(sevColor)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(f.title, MARGIN + 12, doc.y + 4, { width: W - 12 })
        doc.fontSize(8).font('Helvetica').fillColor('#64748b')
          .text(`${f.severity?.toUpperCase()} · ${f.status} · ${f.control_id || '—'}`, { continued: false })
        if (f.description) {
          doc.fontSize(8.5).fillColor('#475569').text(f.description, { width: W - 12 })
        }
        if (f.agreed_action) {
          doc.fontSize(8).fillColor('#15803d').text(`Agreed Action: ${f.agreed_action}`)
        }
        doc.moveDown(0.8)
        rule()
      }
    }

    // ── Workpapers (RCM) ─────────────────────────────────────────────────
    doc.addPage()
    heading1('Workpaper Summary (RCM)')
    rule()

    // Table header
    const cols = [
      { label: 'Control', x: MARGIN,       w: 110 },
      { label: 'Clause',  x: MARGIN + 110, w: 80  },
      { label: 'Status',  x: MARGIN + 190, w: 85  },
      { label: 'Result',  x: MARGIN + 275, w: 85  },
      { label: 'Risk',    x: MARGIN + 360, w: 65  },
      { label: 'Signed',  x: MARGIN + 425, w: 70  },
    ]
    doc.rect(MARGIN, doc.y, W, 16).fill('#1e293b')
    cols.forEach(c => {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff').text(c.label, c.x + 3, doc.y - 13, { width: c.w })
    })
    doc.moveDown(0.5)

    wps.forEach((wp, idx) => {
      if (doc.y > PAGE_H - 60) { doc.addPage(); }
      const ctrl = controls.get(wp.control_id)
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff'
      doc.rect(MARGIN, doc.y, W, 14).fill(bg)
      const rowY = doc.y + 3
      doc.fontSize(7).font('Helvetica').fillColor('#1e293b')
      doc.text(wp.control_id || '—',                  cols[0].x + 3, rowY, { width: cols[0].w - 3 })
      doc.text(ctrl?.clause_ref || '—',               cols[1].x + 3, rowY, { width: cols[1].w - 3 })
      doc.text(wp.implementation_status || '—',       cols[2].x + 3, rowY, { width: cols[2].w - 3 })
      doc.text(wp.test_result || 'Not Tested',        cols[3].x + 3, rowY, { width: cols[3].w - 3 })
      doc.text(wp.residual_risk || '—',               cols[4].x + 3, rowY, { width: cols[4].w - 3 })
      doc.text(wp.signed_off_at ? 'Yes' : 'Pending',  cols[5].x + 3, rowY, { width: cols[5].w - 3 })
      doc.moveDown(0.7)
    })

    // Footer on last page
    doc.moveDown(2)
    rule()
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text(`DPM Platform · ${eng.name} · Confidential · ${new Date().toLocaleDateString('en-GB')}`, { align: 'center' })

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    const filename = `Audit-Report-${(eng.name || 'Report').replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'PDF generation failed: ' + error.message }, { status: 500 })
  }
}