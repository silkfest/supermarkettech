/** Drawing a report onto pages.
 *
 *  Laid out directly rather than printed from the web page, so the output has
 *  no browser URL stamp, no date header, no page that stops a third of the way
 *  down because a card refused to split, and no table running off the margin.
 *  Content flows: a section starts where the last one ended, and only breaks
 *  when the page is actually full.
 */

import type { ReportDoc, DocBlock, DocPhoto } from './doc'
import { pdfFileName } from './doc'

/** The name at the top of every report. The company's, not the app's: the PDF
 *  is what goes to the store, and the store deals with the contractor. */
const BRAND = 'Major Refrigeration'

/* A4 portrait, in millimetres. */
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const FOOTER_H = 12
const CONTENT_W = PAGE_W - MARGIN * 2
/** Lowest y a block may occupy before it has to move to the next page. */
const FLOOR = PAGE_H - FOOTER_H

type Rgb = [number, number, number]

const INK: Record<string, Rgb> = {
  heading: [30, 41, 59],      // slate-800
  body: [51, 65, 85],         // slate-700
  muted: [100, 116, 139],     // slate-500
  faint: [148, 163, 184],     // slate-400
  rule: [226, 232, 240],      // slate-200
  brand: [37, 99, 235],       // blue-600
  ok: [16, 185, 129],         // emerald-500
  critical: [220, 38, 38],    // red-600
  important: [217, 119, 6],   // amber-600
}

type Pdf = import('jspdf').jsPDF

/** Images are fetched once, up front: addImage is synchronous, and a photo that
 *  will not load must not stop the rest of the report being produced. */
type LoadedImage = { dataUrl: string; ratio: number }

async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(blob)
    })
    const ratio = await new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 4 / 3)
      img.onerror = () => resolve(4 / 3)
      img.src = dataUrl
    })
    return { dataUrl, ratio }
  } catch {
    return null
  }
}

function collectPhotos(doc: ReportDoc): DocPhoto[] {
  const out: DocPhoto[] = []
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (block.kind === 'photos') out.push(...block.photos)
    }
  }
  return out
}

/** Fold text into what a standard PDF font can actually draw.
 *
 *  jsPDF's built-in fonts are WinAnsi: a character outside it is dropped, and
 *  the title "CO₂ PM" came out as "CO , PM" with the subscript missing. NFKC
 *  maps compatibility characters onto their plain forms — ₂ to 2, ℃ to °C —
 *  without touching the accents, dashes and middle dots the reports already use.
 *
 *  Applied to the whole document in one pass rather than at each draw call, so
 *  a block added later cannot miss it. */
export function foldForPdf<T>(value: T): T {
  if (typeof value === 'string') return value.normalize('NFKC') as unknown as T
  if (Array.isArray(value)) return value.map(foldForPdf) as unknown as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, foldForPdf(v)])
    ) as T
  }
  return value
}

export async function buildReportPdf(input: ReportDoc): Promise<Blob> {
  const doc = foldForPdf(input)
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  const images = new Map<string, LoadedImage | null>()
  await Promise.all(
    [...new Set(collectPhotos(doc).map(p => p.url))].map(async url => {
      images.set(url, await loadImage(url))
    })
  )

  let y = drawTitleBlock(pdf, doc)

  for (const section of doc.sections) {
    y = drawSection(pdf, autoTable, doc, section, y, images)
  }

  drawFooters(pdf, doc)
  return pdf.output('blob')
}

export async function downloadReportPdf(doc: ReportDoc): Promise<void> {
  const blob = await buildReportPdf(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = pdfFileName(doc)
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/* ── page furniture ─────────────────────────────────────────────────────── */

function drawTitleBlock(pdf: Pdf, doc: ReportDoc): number {
  let y = MARGIN + 4

  pdf.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK.brand)
  pdf.text(BRAND, MARGIN, y)

  pdf.setFontSize(13).setTextColor(...INK.heading)
  pdf.text(doc.title, MARGIN, y + 7)

  if (doc.storeName) {
    pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK.muted)
    pdf.text(doc.storeName, MARGIN, y + 12.5)
  }

  const right = PAGE_W - MARGIN
  pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK.body)
  if (doc.dateStr) pdf.text(doc.dateStr, right, y, { align: 'right' })
  pdf.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...INK.faint)
  doc.meta.forEach((m, i) => pdf.text(m, right, y + 5 + i * 4.2, { align: 'right' }))

  y += doc.storeName ? 16 : 11
  pdf.setDrawColor(...INK.brand).setLineWidth(0.6)
  pdf.line(MARGIN, y, right, y)
  return y + 8
}

/** The running footer, added once every page exists so the total is known. */
function drawFooters(pdf: Pdf, doc: ReportDoc): void {
  const total = pdf.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page)
    const y = PAGE_H - 8
    pdf.setDrawColor(...INK.rule).setLineWidth(0.2)
    pdf.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4)
    pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...INK.faint)
    const left = [doc.title, doc.storeName, doc.dateStr].filter(Boolean).join('  ·  ')
    pdf.text(left, MARGIN, y)
    pdf.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, y, { align: 'right' })
  }
}

function newPage(pdf: Pdf): number {
  pdf.addPage()
  return MARGIN
}

/** Move to a new page unless `needed` millimetres are still free. */
function room(pdf: Pdf, y: number, needed: number): number {
  return y + needed > FLOOR ? newPage(pdf) : y
}

/* ── sections and blocks ────────────────────────────────────────────────── */

type AutoTable = typeof import('jspdf-autotable').default

function drawSection(
  pdf: Pdf,
  autoTable: AutoTable,
  doc: ReportDoc,
  section: { title: string; blocks: DocBlock[] },
  startY: number,
  images: Map<string, LoadedImage | null>,
): number {
  // A heading alone at the foot of a page is worse than a slightly short page,
  // so it only lands where the first row of its content can follow it — a photo
  // row needs far more clearance than a line of text.
  let y = room(pdf, startY, 10 + leadHeight(pdf, section.blocks[0], images))

  pdf.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...INK.muted)
  pdf.text(section.title.toUpperCase(), MARGIN, y, { charSpace: 0.4 })
  y += 2.2
  pdf.setDrawColor(...INK.rule).setLineWidth(0.3)
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 5.5

  for (const block of section.blocks) {
    y = drawBlock(pdf, autoTable, block, y, images)
  }
  return y + 6
}

/** Roughly how tall the first unbreakable row of a block is, used to decide
 *  whether its heading still fits on this page. */
function leadHeight(pdf: Pdf, block: DocBlock | undefined, images: Map<string, LoadedImage | null>): number {
  if (!block) return 0
  switch (block.kind) {
    case 'fields': return 9
    case 'checklist': return 6
    case 'table': return 14
    case 'notes': return 10
    case 'text': return 5
    case 'bullets': return 6
    case 'photos': return (block.caption ? 4 : 0) + photoRowHeight(block.photos.slice(0, 2), images)
  }
}

function drawBlock(
  pdf: Pdf,
  autoTable: AutoTable,
  block: DocBlock,
  y: number,
  images: Map<string, LoadedImage | null>,
): number {
  switch (block.kind) {
    case 'fields': return drawFields(pdf, block.items, y)
    case 'checklist': return drawChecklist(pdf, block.items, block.summary, y)
    case 'table': return drawTable(pdf, autoTable, block.head, block.rows, y)
    case 'notes': return drawNotes(pdf, block.items, y)
    case 'text': return drawText(pdf, block.text, y)
    case 'bullets': return drawBullets(pdf, block.items, y)
    case 'photos': return drawPhotos(pdf, block, y, images)
  }
}

function drawFields(pdf: Pdf, items: { label: string; value: string }[], y: number): number {
  const COLS = 3
  const colW = CONTENT_W / COLS
  let row: typeof items = []
  const flush = () => {
    if (!row.length) return
    // Values wrap, so the row is as tall as its tallest value. The font is set
    // before measuring: splitTextToSize wraps for whatever font is current, so
    // measuring in one size and drawing in another overruns the column.
    pdf.setFont('helvetica', 'normal').setFontSize(9)
    const wrapped = row.map(f => pdf.splitTextToSize(f.value, colW - 4) as string[])
    const h = 4 + Math.max(...wrapped.map(w => w.length)) * 4.2
    y = room(pdf, y, h)
    row.forEach((f, i) => {
      const x = MARGIN + i * colW
      pdf.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...INK.faint)
      pdf.text(f.label.toUpperCase(), x, y, { charSpace: 0.3 })
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK.heading)
      pdf.text(wrapped[i], x, y + 4.2)
    })
    y += h + 1.5
    row = []
  }
  for (const item of items) {
    row.push(item)
    if (row.length === COLS) flush()
  }
  flush()
  return y + 1
}

function drawChecklist(pdf: Pdf, items: { label: string; done: boolean }[], summary: string, y: number): number {
  const textX = MARGIN + 6
  pdf.setFont('helvetica', 'normal').setFontSize(9)
  for (const item of items) {
    const lines = pdf.splitTextToSize(item.label, CONTENT_W - 8) as string[]
    const h = lines.length * 4.3 + 1.4
    y = room(pdf, y, h)
    drawTick(pdf, MARGIN + 1, y - 1.6, item.done)
    pdf.setFont('helvetica', 'normal').setFontSize(9)
    pdf.setTextColor(...(item.done ? INK.body : INK.faint) as Rgb)
    pdf.text(lines, textX, y)
    y += h
  }
  y = room(pdf, y, 8)
  y += 1.5
  pdf.setDrawColor(...INK.rule).setLineWidth(0.2)
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y)
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...INK.faint)
  pdf.text(summary, MARGIN, y + 4)
  // A little air after the summary line: on the CO₂ report the bottle counts
  // follow it directly and were sitting on top of it.
  return y + 9
}

/** A drawn tick and ring: the standard PDF fonts have no check glyph, and a
 *  missing glyph prints as a blank box on half the readers out there. */
function drawTick(pdf: Pdf, x: number, y: number, done: boolean): void {
  if (done) {
    pdf.setDrawColor(...INK.ok).setLineWidth(0.5)
    pdf.lines([[0.9, 1.1], [2.1, -2.6]], x, y + 0.2)
  } else {
    pdf.setDrawColor(...INK.rule).setLineWidth(0.4)
    pdf.circle(x + 1.4, y - 0.5, 1.3, 'S')
  }
}

function drawTable(pdf: Pdf, autoTable: AutoTable, head: string[], rows: string[][], y: number): number {
  autoTable(pdf, {
    head: [head],
    body: rows,
    startY: room(pdf, y, 20),
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H + 2 },
    // linebreak is what keeps a long model number inside the page instead of
    // running past the margin the way the printed web table did.
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, overflow: 'linebreak', lineColor: [203, 213, 225], lineWidth: 0.1, textColor: [51, 65, 85] },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    // A table taller than the page continues on the next one, under its heading
    // row, rather than being clipped — and a row that will not fit moves whole,
    // instead of leaving its last line stranded at the top of the next page.
    rowPageBreak: 'avoid',
    tableWidth: CONTENT_W,
    theme: 'grid',
  })
  const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
  return (finalY ?? y) + 4
}

function drawNotes(pdf: Pdf, items: { text: string; importance: string; meta?: string }[], y: number): number {
  for (const note of items) {
    const accent: Rgb = note.importance === 'CRITICAL' ? INK.critical
      : note.importance === 'IMPORTANT' ? INK.important
      : INK.ok
    // Measured, not estimated: a guessed width let a long note run under the
    // IMPORTANT tag and print the two on top of each other.
    pdf.setFont('helvetica', 'bold').setFontSize(7)
    const tagW = pdf.getTextWidth(note.importance) + note.importance.length * 0.3 + 6
    pdf.setFont('helvetica', 'normal').setFontSize(9)
    const lines = pdf.splitTextToSize(note.text, CONTENT_W - 6 - tagW) as string[]
    const h = Math.max(8, lines.length * 4.3 + (note.meta ? 4 : 0) + 3)
    y = room(pdf, y, h + 2)

    pdf.setFillColor(...accent)
    pdf.rect(MARGIN, y - 3.5, 1.2, h, 'F')

    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK.body)
    pdf.text(lines, MARGIN + 4, y)
    let after = y + lines.length * 4.3
    if (note.meta) {
      pdf.setFontSize(7.5).setTextColor(...INK.faint)
      pdf.text(note.meta, MARGIN + 4, after)
      after += 4
    }
    pdf.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...accent)
    pdf.text(note.importance, PAGE_W - MARGIN, y, { align: 'right', charSpace: 0.3 })

    y = Math.max(after, y + h - 3.5) + 3
  }
  return y
}

function drawText(pdf: Pdf, text: string, y: number): number {
  pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...INK.body)
  // Paragraph by paragraph, so a long write-up splits across pages instead of
  // overflowing one.
  for (const paragraph of text.split(/\n{2,}/)) {
    for (const line of pdf.splitTextToSize(paragraph, CONTENT_W) as string[]) {
      y = room(pdf, y, 5)
      pdf.text(line, MARGIN, y)
      y += 4.6
    }
    y += 2
  }
  return y
}

function drawBullets(pdf: Pdf, items: string[], y: number): number {
  pdf.setFont('helvetica', 'normal').setFontSize(9.5)
  for (const item of items) {
    const lines = pdf.splitTextToSize(item, CONTENT_W - 6) as string[]
    y = room(pdf, y, lines.length * 4.6 + 1)
    pdf.setFillColor(...INK.brand)
    pdf.circle(MARGIN + 1.2, y - 1.2, 0.8, 'F')
    pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...INK.body)
    pdf.text(lines, MARGIN + 5, y)
    y += lines.length * 4.6 + 1
  }
  return y + 1
}

const PHOTO_GAP = 6
const PHOTO_CELL_W = (CONTENT_W - PHOTO_GAP) / 2
/** Two to a row at this height leaves a full page able to carry a section of
 *  photos plus the text above it, rather than pushing the photos onto a page of
 *  their own. */
const PHOTO_MAX_H = 52

/** Height of a photo in its half-width cell: tall shots are capped rather than
 *  allowed to take a page each. */
function photoHeight(photo: DocPhoto, images: Map<string, LoadedImage | null>): number {
  const img = images.get(photo.url)
  return img ? Math.min(PHOTO_MAX_H, PHOTO_CELL_W / img.ratio) : 26
}

function photoRowHeight(row: DocPhoto[], images: Map<string, LoadedImage | null>): number {
  if (!row.length) return 0
  return Math.max(...row.map(p => photoHeight(p, images))) + (row.some(p => p.label) ? 4.5 : 0)
}

function drawPhotos(
  pdf: Pdf,
  block: Extract<DocBlock, { kind: 'photos' }>,
  y: number,
  images: Map<string, LoadedImage | null>,
): number {
  const GAP = PHOTO_GAP
  const cellW = PHOTO_CELL_W

  if (block.caption) {
    // The unit's name goes on the same page as its photos, not stranded at the
    // foot of the previous one.
    y = room(pdf, y, 4 + photoRowHeight(block.photos.slice(0, 2), images) + 3)
    pdf.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...INK.muted)
    pdf.text(block.caption.toUpperCase(), MARGIN, y, { charSpace: 0.3 })
    y += 4
  }

  for (let i = 0; i < block.photos.length; i += 2) {
    const pair = block.photos.slice(i, i + 2)
    const drawn = pair.map(p => ({ photo: p, img: images.get(p.url) ?? null, h: photoHeight(p, images) }))
    const rowH = photoRowHeight(pair, images)
    y = room(pdf, y, rowH + 3)

    drawn.forEach((d, col) => {
      const x = MARGIN + col * (cellW + GAP)
      if (d.img) {
        const w = Math.min(cellW, d.h * d.img.ratio)
        pdf.addImage(d.img.dataUrl, x, y, w, d.h, undefined, 'FAST')
        pdf.setDrawColor(...INK.rule).setLineWidth(0.2)
        pdf.rect(x, y, w, d.h, 'S')
      } else {
        // The report still records that a photo belongs here, rather than
        // silently printing one fewer than the tech took.
        pdf.setFillColor(248, 250, 252).setDrawColor(...INK.rule).setLineWidth(0.2)
        pdf.rect(x, y, cellW, d.h, 'FD')
        pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...INK.faint)
        pdf.text('Photo could not be loaded', x + cellW / 2, y + d.h / 2, { align: 'center' })
      }
      if (d.photo.label) {
        pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...INK.muted)
        pdf.text(pdf.splitTextToSize(d.photo.label, cellW)[0], x, y + d.h + 3.5)
      }
    })
    y += rowH + 4
  }
  return y
}
