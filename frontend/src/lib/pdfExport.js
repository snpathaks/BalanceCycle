/**
 * Browser-side PDF export using jsPDF + html2canvas.
 * Generates a formatted summary for doctor appointments.
 * No data is sent to any server — everything is done in-browser.
 */
import jsPDF from 'jspdf'

const CRIMSON = [142, 27, 44]
const INK = [43, 21, 24]
const SOFT = [122, 90, 94]

function addHeader(doc, title, subtitle) {
  doc.setFillColor(...CRIMSON)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BalanceCycle — Health Summary', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 196, 12, { align: 'right' })
  doc.setTextColor(...INK)
  return 28
}

function section(doc, label, y) {
  doc.setFillColor(241, 211, 214)
  doc.rect(14, y - 5, 182, 8, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CRIMSON)
  doc.text(label.toUpperCase(), 16, y)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  return y + 8
}

function checkPageBreak(doc, y, needed = 20) {
  if (y + needed > 280) {
    doc.addPage()
    return 20
  }
  return y
}

export async function exportToPDF(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const now = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  let y = addHeader(doc, 'BalanceCycle Health Summary', `Generated ${now}`)

  // ── Disclaimer ────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(...SOFT)
  doc.text(
    'This document provides general wellness information and symptom tracking only. It is not a substitute for professional medical advice.',
    14, y, { maxWidth: 182 }
  )
  y += 10

  // ── Cycle prediction ───────────────────────────────────
  if (data.prediction?.next_period_start) {
    y = section(doc, 'Cycle Prediction', y + 4)
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(`Average cycle length: ${data.prediction.average_cycle_length ?? '—'} days`, 16, y)
    y += 5
    doc.text(`Next period predicted: ${data.prediction.next_period_start ?? '—'}`, 16, y)
    y += 5
    if (data.prediction.fertile_window_start) {
      doc.text(`Fertile window: ${data.prediction.fertile_window_start} – ${data.prediction.fertile_window_end}`, 16, y)
      y += 5
    }
    doc.text(`Prediction confidence: ${data.prediction.confidence}`, 16, y)
    y += 8
  }

  // ── Recent logs ────────────────────────────────────────
  y = section(doc, 'Recent Symptom Logs (last 20)', y + 4)
  const logs = (data.logs || []).slice(0, 20)
  doc.setFontSize(8.5)
  for (const log of logs) {
    y = checkPageBreak(doc, y, 16)
    const date = new Date(log.created_at).toLocaleDateString('en-IN')
    const severity = log.severity || 'unknown'
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CRIMSON)
    doc.text(`${date}  [${severity}]`, 16, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    y += 4.5
    const wrapped = doc.splitTextToSize(`"${log.raw_text}"`, 178)
    doc.text(wrapped.slice(0, 2), 16, y)
    y += wrapped.slice(0, 2).length * 4 + 2
    if (log.extracted_symptoms?.length) {
      const syms = log.extracted_symptoms.map(s => s.symptom_name).join(', ')
      doc.setTextColor(...SOFT)
      doc.setFontSize(7.5)
      doc.text(`Symptoms: ${syms}`, 18, y)
      doc.setFontSize(8.5)
      doc.setTextColor(...INK)
      y += 4
    }
  }

  // ── Triage cards ───────────────────────────────────────
  y = checkPageBreak(doc, y, 20)
  y = section(doc, 'Triage Summary', y + 4)
  const cards = (data.triage_cards || []).slice(0, 10)
  for (const card of cards) {
    y = checkPageBreak(doc, y, 14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(card.badge === 'talk-to-doctor' ? 142 : card.badge === 'watch' ? 154 : 90,
                     card.badge === 'talk-to-doctor' ? 27  : card.badge === 'watch' ? 78  : 130,
                     card.badge === 'talk-to-doctor' ? 44  : card.badge === 'watch' ? 26  : 90)
    doc.text(`[${card.badge.toUpperCase()}]  ${card.symptom_summary}`, 16, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SOFT)
    doc.setFontSize(7.5)
    const rationale = doc.splitTextToSize(card.rationale, 178)
    y += 4
    doc.text(rationale.slice(0, 2), 18, y)
    y += rationale.slice(0, 2).length * 3.5 + 3
    doc.setFontSize(8.5)
    doc.setTextColor(...INK)
  }

  // ── Remedy journal ─────────────────────────────────────
  if (data.remedy_journal?.length) {
    y = checkPageBreak(doc, y, 20)
    y = section(doc, 'Personal Remedy Journal', y + 4)
    doc.setFontSize(8.5)
    for (const rem of data.remedy_journal.slice(0, 15)) {
      y = checkPageBreak(doc, y, 10)
      const helped = rem.helped === true ? '✓ helped' : rem.helped === false ? '✗ didn\'t help' : '?'
      doc.text(`• ${rem.symptom_name}: ${rem.remedy_text}  (${helped}${rem.rating ? `, ${rem.rating}/5` : ''})`, 16, y, { maxWidth: 180 })
      y += 5
    }
  }

  doc.save(`BalanceCycle_Summary_${now.replace(/ /g, '_')}.pdf`)
}
