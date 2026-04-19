import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export interface ComponentRecord {
  key: string
  type: string
  manufacturer: string
  model: string
  serial: string
  manualId: string
  manualTitle: string
  storeName: string
  equipmentId: string | null
  pmReportId: string
  pmDate: string
  rackLabel: string
  slot: number | null
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.toLowerCase().trim() ?? ''
  const type = searchParams.get('type')?.trim() ?? ''

  const supabase = getSupabaseServer()

  const { data: reports, error } = await supabase
    .from('pm_reports')
    .select('id, store_name, performed_at, equipment_id, units')
    .eq('report_type', 'refrigeration')
    .not('units', 'is', null)
    .order('performed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const components: ComponentRecord[] = []
  // Deduplicate — keep only the most recent PM entry for each (storeName + rackLabel + slot + model/serial combo)
  const seen = new Set<string>()

  for (const report of reports ?? []) {
    const units = report.units as Record<string, unknown>
    if (!units || !Array.isArray(units.racks)) continue

    let rackIdx = 0
    for (const rack of units.racks as Record<string, unknown>[]) {
      if (rack.unitType !== 'rack') continue

      const rackLabel = `Rack ${LETTERS[rackIdx] ?? rackIdx + 1}`
      const count     = (rack.compressorCount as number | undefined) ?? 8

      // ── Compressors ──
      for (let i = 0; i < count; i++) {
        const model  = ((rack.compressorModels  as string[]) ?? [])[i] ?? ''
        const serial = ((rack.compressorSerials as string[]) ?? [])[i] ?? ''
        if (!model && !serial) continue

        const dedupeKey = `${report.store_name}|${rackLabel}|comp${i}|${model}|${serial}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        components.push({
          key:         `${report.id}-rack${rackIdx}-comp${i}`,
          type:        'Compressor',
          manufacturer: (rack.compressorManufacturer as string) ?? '',
          model,
          serial,
          manualId:    ((rack.compressorManualIds    as string[]) ?? [])[i] ?? '',
          manualTitle: ((rack.compressorManualTitles as string[]) ?? [])[i] ?? '',
          storeName:   report.store_name ?? '',
          equipmentId: report.equipment_id ?? null,
          pmReportId:  report.id,
          pmDate:      report.performed_at,
          rackLabel,
          slot:        i + 1,
        })
      }

      // ── Other components ──
      for (const comp of (rack.otherComponents as Record<string, string>[] | undefined) ?? []) {
        const { model = '', serial = '', manufacturer = '', componentType = '' } = comp
        if (!model && !serial && !manufacturer) continue

        const dedupeKey = `${report.store_name}|${rackLabel}|${componentType}|${model}|${serial}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        components.push({
          key:         `${report.id}-rack${rackIdx}-${comp.id ?? Math.random()}`,
          type:        componentType || 'Other',
          manufacturer,
          model,
          serial,
          manualId:    comp.manualId    ?? '',
          manualTitle: comp.manualTitle ?? '',
          storeName:   report.store_name ?? '',
          equipmentId: report.equipment_id ?? null,
          pmReportId:  report.id,
          pmDate:      report.performed_at,
          rackLabel,
          slot:        null,
        })
      }

      rackIdx++
    }
  }

  // Apply filters
  let out = components
  if (q) {
    out = out.filter(c =>
      c.model.toLowerCase().includes(q)        ||
      c.manufacturer.toLowerCase().includes(q) ||
      c.serial.toLowerCase().includes(q)       ||
      c.storeName.toLowerCase().includes(q)    ||
      c.type.toLowerCase().includes(q)
    )
  }
  if (type) out = out.filter(c => c.type === type)

  return NextResponse.json(out)
}
