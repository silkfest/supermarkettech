/** A report, described once, independently of how it is drawn.
 *
 *  The PDF used to be whatever the browser's print dialog made of the web page,
 *  which is why a report came out as three mostly-empty pages with the
 *  equipment table sliced off at the margin and the page URL stamped across the
 *  bottom. None of that is fixable from the page: the URL and date are the
 *  browser's own, and the gaps come from print rules written for a screen
 *  layout.
 *
 *  So the report is turned into this neutral shape — sections of blocks — and
 *  the PDF is laid out from it directly. Everything here is pure, which is the
 *  point: what goes on the page can be tested without drawing anything.
 */

import { REFRIG_CHECKLIST, HVAC_CHECKLIST } from '../maintenance/checklists'
import { type EquipmentType, usesRefrigerant, equipmentLabel } from '../maintenance/hvac-equipment'

export interface DocPhoto { url: string; label: string }

export type DocBlock =
  /** Short labelled values, set two or three to a row. */
  | { kind: 'fields'; items: { label: string; value: string }[] }
  | { kind: 'checklist'; items: { label: string; done: boolean }[]; summary: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'notes'; items: { text: string; importance: string; meta?: string }[] }
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'photos'; caption?: string; photos: DocPhoto[] }

export interface DocSection {
  title: string
  blocks: DocBlock[]
}

export interface ReportDoc {
  /** 'HVAC PM', 'Refrigeration PM', 'Service Report' */
  title: string
  storeName: string
  dateStr: string
  /** Shown under the date: season, job number. */
  meta: string[]
  sections: DocSection[]
}

export type ReportKind = 'hvac' | 'refrigeration' | 'individual'

/* ── reading whatever the API returned ──────────────────────────────────── */

type Obj = Record<string, unknown>

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const strs = (v: unknown): string[] => arr(v).map(str)

const photos = (v: unknown): DocPhoto[] =>
  arr(v)
    .map(p => obj(p))
    .filter((p): p is Obj => !!p && !!str(p.url))
    .map(p => ({ url: str(p.url), label: str(p.label) }))

/** Fields with nothing in them are left out rather than printed as a dash —
 *  a report full of em dashes reads as a form, not as a record of a visit. */
const fields = (items: { label: string; value: string }[]): DocBlock[] => {
  const kept = items.filter(i => i.value !== '')
  return kept.length ? [{ kind: 'fields', items: kept }] : []
}

const dash = (v: string) => (v === '' ? '—' : v)

export function formatReportDate(raw: unknown): string {
  const text = str(raw)
  if (!text) return ''
  // Date-only strings are parsed as UTC, which can land on the previous day in
  // a western time zone — the PM would print as the day before it happened.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return text
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* ── the three report types ─────────────────────────────────────────────── */

export function buildReportDoc(kind: ReportKind, data: Obj): ReportDoc {
  const base: ReportDoc = {
    title: kind === 'hvac' ? 'HVAC PM' : kind === 'refrigeration' ? 'Refrigeration PM' : 'Service Report',
    storeName: str(data.store_name),
    dateStr: formatReportDate(data.performed_at),
    meta: [],
    sections: [],
  }
  const season = str(data.pm_season)
  const simpro = str(data.simpro_number)
  if (season) base.meta.push(`${season} PM`)
  if (simpro) base.meta.push(`Simpro #${simpro}`)

  base.sections =
    kind === 'hvac' ? hvacSections(data)
    : kind === 'refrigeration' ? refrigerationSections(data)
    : individualSections(data)

  return base
}

function siteSection(data: Obj): DocSection[] {
  const units = obj(data.units)
  const tech = obj(units?.technician)
  const blocks = fields([
    { label: 'Store / Site', value: str(data.store_name) },
    { label: 'Address', value: str(units?.storeAddress) },
    { label: 'Technician', value: str(tech?.name) },
    { label: 'Certification', value: str(tech?.cert) },
  ])
  return blocks.length ? [{ title: 'Site & Technician', blocks }] : []
}

function checklistSection(title: string, checklist: Obj | null, labels: { id: string; label: string }[]): DocSection[] {
  if (!checklist) return []
  const items = labels.map(l => ({ label: l.label, done: checklist[l.id] === true }))
  const done = items.filter(i => i.done).length
  const outstanding = items.length - done
  const summary = `${done} of ${items.length} items completed`
    + (outstanding > 0 ? ` · ${outstanding} outstanding` : '')
  return [{ title, blocks: [{ kind: 'checklist', items, summary }] }]
}

function notesSection(title: string, raw: unknown, meta?: (n: Obj) => string): DocSection[] {
  const items = arr(raw)
    .map(n => obj(n))
    .filter((n): n is Obj => !!n)
    .map(n => ({
      // The two forms differ: HVAC deficiencies carry `note`, refrigeration
      // notes carry `text`. Both reach this one shape.
      text: str(n.note) || str(n.text),
      importance: str(n.importance) || 'ROUTINE',
      meta: meta?.(n) || undefined,
    }))
    .filter(n => n.text !== '')
  return items.length ? [{ title, blocks: [{ kind: 'notes', items }] }] : []
}

function photosSection(raw: unknown): DocSection[] {
  const list = photos(raw)
  return list.length ? [{ title: 'Photos', blocks: [{ kind: 'photos', photos: list }] }] : []
}

/* ── HVAC ───────────────────────────────────────────────────────────────── */

function hvacSections(data: Obj): DocSection[] {
  const units = obj(data.units)
  const equipment = arr(units?.equipment).map(e => obj(e)).filter((e): e is Obj => !!e)

  const label = (e: Obj) => equipmentLabel(str(e.type) as EquipmentType, str(e.serviceArea)) || 'Unit'

  const equipmentSection: DocSection[] = equipment.length ? [{
    title: 'Equipment',
    blocks: [
      {
        kind: 'table',
        head: ['Unit', 'Brand', 'Model', 'Serial', 'Refrigerant', 'Voltage'],
        rows: equipment.map(e => [
          label(e),
          dash(str(e.brand)),
          dash(str(e.modelNumber)),
          dash(str(e.serialNumber)),
          // Blank on a gas unit heater or an exhaust fan is not missing data —
          // the form never asks. Saying N/A keeps it from reading as an omission.
          str(e.refrigerantType) || (usesRefrigerant(str(e.type) as EquipmentType) ? '—' : 'N/A'),
          dash(str(e.voltage)),
        ]),
      },
      ...equipment
        .filter(e => photos(e.photos).length > 0)
        .map((e): DocBlock => ({ kind: 'photos', caption: label(e), photos: photos(e.photos) })),
    ],
  }] : []

  return [
    ...siteSection(data),
    ...checklistSection('PM Checklist', obj(data.checklist), HVAC_CHECKLIST.map((label, i) => ({ id: `item${i + 1}`, label }))),
    ...equipmentSection,
    ...notesSection('Deficiencies', data.notes, n => {
      const idx = typeof n.equipmentIndex === 'number' ? n.equipmentIndex : null
      const unit = idx !== null && equipment[idx] ? label(equipment[idx]) : ''
      const asset = str(n.assetId)
      return [unit && `Unit: ${unit}`, asset && `Asset: ${asset}`].filter(Boolean).join(' · ')
    }),
    ...photosSection(data.photos),
  ]
}

/* ── Refrigeration ──────────────────────────────────────────────────────── */

const RACK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function refrigerationSections(data: Obj): DocSection[] {
  const units = obj(data.units)
  const racks = arr(units?.racks).map(r => obj(r)).filter((r): r is Obj => !!r)

  const rackSections: DocSection[] = racks.map((r, idx) => {
    const title = str(r.tabDisplayName) || `Rack ${RACK_LETTERS[idx] ?? idx + 1}`
    const count = typeof r.compressorCount === 'number' ? r.compressorCount : 1
    const col = (v: unknown) => strs(v)
    const models = col(r.compressorModels), serials = col(r.compressorSerials)
    const amps = col(r.compAmps), volts = col(r.compVolts)
    const oilPots = col(r.oilPotsPercent), oilPress = col(r.oilPress)
    const hp = col(r.hpSetPoints), lp = col(r.lpSetPoints)

    const blocks: DocBlock[] = fields([
      { label: 'Rack Manufacturer', value: str(r.rackManufacturer) },
      { label: 'Compressor Mfr', value: str(r.compressorManufacturer) },
      { label: 'Refrigerant', value: str(r.refrigerant) },
      { label: 'Rack Type', value: str(r.rackType) },
      { label: 'Oil Condition', value: str(r.oilConditionAcidTest) },
      { label: 'Condenser Condition', value: str(r.condenserConditions) },
      { label: 'Sight Glass', value: str(r.liquidLineSightGlass) },
      { label: 'Receiver Levels', value: str(r.receiverLevels) },
      { label: 'Suction Setpoint', value: str(r.suctionPressureSetpoint) },
      { label: 'Suction Actual', value: str(r.suctionPressureActual) },
      { label: 'Discharge Setpoint', value: str(r.dischargePressureSetpoint) },
      { label: 'Discharge Actual', value: str(r.dischargePressureActual) },
      { label: 'Control Voltage', value: str(r.controlVoltage) },
      { label: 'Reservoir %', value: str(r.reservoirPercent) },
      { label: 'Defrost Differential', value: str(r.defrostDifferential) },
      { label: 'Heat Reclaim', value: str(r.heatReclaim) },
    ])

    if (count > 0) {
      blocks.push({
        kind: 'table',
        head: ['Comp', 'Model', 'Serial', 'Amps', 'Volts', 'Oil Pot %', 'Oil Press', 'HP Set', 'LP Set'],
        rows: Array.from({ length: count }, (_, i) => [
          String(i + 1),
          dash(models[i] ?? ''), dash(serials[i] ?? ''), dash(amps[i] ?? ''), dash(volts[i] ?? ''),
          dash(oilPots[i] ?? ''), dash(oilPress[i] ?? ''), dash(hp[i] ?? ''), dash(lp[i] ?? ''),
        ]),
      })
    }
    return { title, blocks }
  }).filter(s => s.blocks.length > 0)

  return [
    ...siteSection(data),
    ...checklistSection('Checklist', obj(data.checklist), REFRIG_CHECKLIST),
    ...rackSections,
    ...notesSection('Notes & Deficiencies', data.notes),
    ...photosSection(data.photos),
  ]
}

/* ── Individual service report ──────────────────────────────────────────── */

function individualSections(data: Obj): DocSection[] {
  const equipment = obj(data.equipment)
  const specs = arr(equipment?.specs).map(s => obj(s)).filter((s): s is Obj => !!s)

  const equipmentBlocks: DocBlock[] = equipment ? [
    ...fields([
      { label: 'Unit', value: str(equipment.name) },
      { label: 'Manufacturer', value: str(equipment.manufacturer) },
      { label: 'Model', value: str(equipment.model) },
      { label: 'Serial', value: str(equipment.serial_number) },
      { label: 'Refrigerant', value: str(equipment.refrigerant) },
      { label: 'Location', value: str(equipment.location) },
    ]),
    ...(specs.length ? [{
      kind: 'table' as const,
      head: ['Spec', 'Value'],
      rows: specs.map(s => [str(s.label), str(s.value)]),
    }] : []),
  ] : []

  const text = (title: string, value: unknown): DocSection[] =>
    str(value) ? [{ title, blocks: [{ kind: 'text', text: str(value) }] }] : []

  const parts = strs(data.parts_needed).filter(p => p !== '')

  return [
    ...(equipmentBlocks.length ? [{ title: 'Equipment', blocks: equipmentBlocks }] : []),
    ...text('Issue / Complaint', data.issue_explanation),
    ...text('Steps Taken', data.steps_taken),
    ...text("What's Next", data.whats_next),
    ...(parts.length ? [{ title: 'Parts Needed', blocks: [{ kind: 'bullets' as const, items: parts }] }] : []),
    ...photosSection(data.photos),
  ]
}

/** The downloaded file's name: store, type and date, so a folder full of them
 *  sorts and reads sensibly. */
export function pdfFileName(doc: ReportDoc): string {
  const slug = (s: string) => s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  const parts = [doc.storeName, doc.title, doc.dateStr].map(slug).filter(Boolean)
  return `${parts.join('_') || 'report'}.pdf`
}
