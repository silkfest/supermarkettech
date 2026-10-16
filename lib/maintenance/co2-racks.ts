/** Racks on a CO₂ store PM.
 *
 *  A CO₂ store is rarely one rack. Sobeys 4737 runs a 7-compressor LT/MT
 *  booster alongside a 4-compressor MT rack, and the form used to hold one of
 *  them — the second had to go on a report of its own or not at all. So a CO₂
 *  PM carries a list of racks, and this module is what the form, the report
 *  page and the PDF all read so the three agree on what a rack is.
 *
 *  It also reads what it can off the rack's equipment record. A nameplate only
 *  supplies the standing facts — who built it, what compressors are in it, how
 *  many. Every reading on the form (amps, volts, oil, set points) is taken in
 *  the machine room and is nobody's business to guess.
 */

export interface EquipmentSpec {
  label: string
  value: string
}

/** The fields of an equipment record this module reads. */
export interface Co2RackEquipment {
  id: string
  name: string
  manufacturer: string | null
  model: string | null
  refrigerant: string | null
  specs: EquipmentSpec[] | null
}

/** The paper form prints eight compressor columns. */
export const CO2_SLOTS = 8

/** Value of the first spec whose label contains every keyword (case-insensitive). */
export function findSpec(specs: EquipmentSpec[] | null, ...keywords: string[]): string | null {
  if (!specs) return null
  return specs.find(s => {
    const label = s.label.toLowerCase()
    return keywords.every(k => label.includes(k))
  })?.value ?? null
}

/** The summary spec that counts the rack's compressors — e.g.
 *  "7 total — 1× Bitzer 2GSL-3K-5SU + 3× Bitzer 2CSL-6K-5SU + ...".
 *
 *  Matched on the "<n> total" value rather than the label alone, because
 *  "Compressor Supply" and "Compressor MCA / MOPD" also say "compressor" and
 *  describe electrical ratings, not how many are on the rack. */
function compressorSummary(specs: EquipmentSpec[] | null): EquipmentSpec | null {
  if (!specs) return null
  return specs.find(s => s.label.toLowerCase().includes('compressor') && /^\d+\s*total\b/i.test(s.value)) ?? null
}

/** How many compressors the record says are on the rack, clamped to the slots
 *  the form has. Null when the record doesn't say — the tech picks it. */
export function findCompressorCount(specs: EquipmentSpec[] | null): number | null {
  const match = compressorSummary(specs)?.value.match(/\d+/)
  if (!match) return null
  return Math.min(CO2_SLOTS, Math.max(1, parseInt(match[0], 10)))
}

/** Compressor make — a dedicated spec if there is one, otherwise read out of
 *  the summary ("4 total — 4× Bitzer 4DTC-25K-5PU" → "Bitzer"). */
export function findCompressorManufacturer(specs: EquipmentSpec[] | null): string {
  const direct = findSpec(specs, 'compressor', 'manufacturer')
  if (direct) return direct
  const match = compressorSummary(specs)?.value.match(/\d+\s*[×x]\s*([A-Za-z][A-Za-z-]*)/)
  return match ? match[1] : ''
}

/** Per-compressor nameplate data, one entry per slot, read from the
 *  "Compressor <n> — <model>" specs the cataloging standard writes. */
function compressorNameplates(specs: EquipmentSpec[] | null): { model: string; rla: string }[] {
  const out = Array.from({ length: CO2_SLOTS }, () => ({ model: '', rla: '' }))
  if (!specs) return out
  for (const s of specs) {
    const labelMatch = s.label.match(/^Compressor\s+(\d+)\s*[—-]\s*(.+)$/i)
    if (!labelMatch) continue
    const idx = parseInt(labelMatch[1], 10) - 1
    if (idx < 0 || idx >= out.length) continue
    out[idx] = {
      model: labelMatch[2].trim(),
      rla: s.value.match(/RLA\s*([\d.]+)\s*A/i)?.[1] ?? '',
    }
  }
  return out
}

/** Compressor model per slot. These are filled onto the report and saved with
 *  it, so the PDF can print what was in the rack on the day of the PM even if
 *  a compressor is swapped and the catalogue moves on afterwards. */
export function compressorModels(specs: EquipmentSpec[] | null): string[] {
  return compressorNameplates(specs).map(n => n.model)
}

/** The running-load amps each compressor is rated for, shown beside the amps
 *  box on the form. This is what makes a measured reading mean something:
 *  40.3 A on a 4DTC-25K is normal, on a 2CSL-6K it is a failure.
 *
 *  Not stored on the report — a rating is a property of the compressor, so it
 *  is read back from the equipment record and cannot drift from it. */
export function compressorRlas(specs: EquipmentSpec[] | null): string[] {
  return compressorNameplates(specs).map(n => (n.rla ? `RLA ${n.rla} A` : ''))
}

/** The racks on a saved report.
 *
 *  Reports written before the form held more than one rack have a single
 *  `units.rack` object; those keep opening and printing unchanged. */
export function co2RackList(units: unknown): Record<string, unknown>[] {
  if (!units || typeof units !== 'object' || Array.isArray(units)) return []
  const u = units as Record<string, unknown>
  if (Array.isArray(u.racks)) {
    return u.racks.filter((r): r is Record<string, unknown> =>
      !!r && typeof r === 'object' && !Array.isArray(r))
  }
  if (u.rack && typeof u.rack === 'object' && !Array.isArray(u.rack)) {
    return [u.rack as Record<string, unknown>]
  }
  return []
}

/** What a rack is called on a tab, a heading and in the PDF. Falls back to its
 *  position so an unnamed rack is still something a tech can point at. */
export function co2RackTitle(name: unknown, index: number): string {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return trimmed || `Rack ${index + 1}`
}
