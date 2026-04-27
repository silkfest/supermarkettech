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
  manualUrl: string
  photoUrl: string
  refrigerant: string
  installDate: string
  oilType: string
  status: string            // 'active' | 'spare' | 'decommissioned'
  notes: string
  lastServiceDate: string
  assetTag: string
  troubleshooting: string
  storeName: string
  equipmentId: string | null
  pmReportId: string
  pmDate: string
  rackLabel: string
  slot: number | null
  isCatalog: boolean
  catalogId: string | null
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.toLowerCase().trim() ?? ''
  const type = searchParams.get('type')?.trim() ?? ''

  const supabase = getSupabaseServer()

  const [reportsResult, catalogResult] = await Promise.all([
    supabase
      .from('pm_reports')
      .select('id, store_name, performed_at, equipment_id, units')
      .eq('report_type', 'refrigeration')
      .not('units', 'is', null)
      .order('performed_at', { ascending: false }),
    supabase
      .from('manual_components')
      .select('*')
      .order('type')
      .order('manufacturer')
      .order('created_at', { ascending: true }),
  ])

  if (reportsResult.error) return NextResponse.json({ error: reportsResult.error.message }, { status: 500 })

  const components: ComponentRecord[] = []
  const seen = new Set<string>()

  // ── PM-derived components ──
  for (const report of reportsResult.data ?? []) {
    const units = report.units as Record<string, unknown>
    if (!units || !Array.isArray(units.racks)) continue

    let rackIdx = 0
    for (const rack of units.racks as Record<string, unknown>[]) {
      if (rack.unitType !== 'rack') continue

      const rackLabel = `Rack ${LETTERS[rackIdx] ?? rackIdx + 1}`
      const count     = (rack.compressorCount as number | undefined) ?? 8

      for (let i = 0; i < count; i++) {
        const model  = ((rack.compressorModels  as string[]) ?? [])[i] ?? ''
        const serial = ((rack.compressorSerials as string[]) ?? [])[i] ?? ''
        if (!model && !serial) continue

        const dedupeKey = `${report.store_name}|${rackLabel}|comp${i}|${model}|${serial}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        components.push({
          key:             `${report.id}-rack${rackIdx}-comp${i}`,
          type:            'Compressor',
          manufacturer:    (rack.compressorManufacturer as string) ?? '',
          model,
          serial,
          manualId:        ((rack.compressorManualIds    as string[]) ?? [])[i] ?? '',
          manualTitle:     ((rack.compressorManualTitles as string[]) ?? [])[i] ?? '',
          manualUrl:       '',
          photoUrl:        '',
          refrigerant:     '',
          installDate:     '',
          oilType:         '',
          status:          'active',
          notes:           '',
          lastServiceDate: '',
          assetTag:        '',
          troubleshooting: '',
          storeName:       report.store_name ?? '',
          equipmentId:     report.equipment_id ?? null,
          pmReportId:      report.id,
          pmDate:          report.performed_at,
          rackLabel,
          slot:            i + 1,
          isCatalog:       false,
          catalogId:       null,
        })
      }

      for (const comp of (rack.otherComponents as Record<string, string>[] | undefined) ?? []) {
        const { model = '', serial = '', manufacturer = '', componentType = '' } = comp
        if (!model && !serial && !manufacturer) continue

        const dedupeKey = `${report.store_name}|${rackLabel}|${componentType}|${model}|${serial}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        components.push({
          key:             `${report.id}-rack${rackIdx}-${comp.id ?? Math.random()}`,
          type:            componentType || 'Other',
          manufacturer,
          model,
          serial,
          manualId:        comp.manualId    ?? '',
          manualTitle:     comp.manualTitle ?? '',
          manualUrl:       '',
          photoUrl:        '',
          refrigerant:     '',
          installDate:     '',
          oilType:         '',
          status:          'active',
          notes:           '',
          lastServiceDate: '',
          assetTag:        '',
          troubleshooting: '',
          storeName:       report.store_name ?? '',
          equipmentId:     report.equipment_id ?? null,
          pmReportId:      report.id,
          pmDate:          report.performed_at,
          rackLabel,
          slot:            null,
          isCatalog:       false,
          catalogId:       null,
        })
      }

      rackIdx++
    }
  }

  // ── Catalog entries from manual_components ──
  for (const c of catalogResult.data ?? []) {
    components.push({
      key:             `catalog-${c.id}`,
      type:            c.type            || 'Other',
      manufacturer:    c.manufacturer    ?? '',
      model:           c.model           ?? '',
      serial:          c.serial          ?? '',
      manualId:        c.manual_id       ?? '',
      manualTitle:     c.manual_title    ?? '',
      manualUrl:       c.manual_url      ?? '',
      photoUrl:        c.photo_url       ?? '',
      refrigerant:     c.refrigerant     ?? '',
      installDate:     c.install_date    ?? '',
      oilType:         c.oil_type        ?? '',
      status:          c.status          ?? 'active',
      notes:           c.notes           ?? '',
      lastServiceDate: c.last_service_date ?? '',
      assetTag:        c.asset_tag       ?? '',
      troubleshooting: c.troubleshooting ?? '',
      storeName:       c.store_name      ?? '',
      equipmentId:     c.equipment_id    ?? null,
      pmReportId:      '',
      pmDate:          c.created_at      ?? '',
      rackLabel:       c.rack_label      ?? '',
      slot:            c.slot            ?? null,
      isCatalog:       true,
      catalogId:       c.id,
    })
  }

  let out = components
  if (q) {
    out = out.filter(c =>
      c.model.toLowerCase().includes(q)        ||
      c.manufacturer.toLowerCase().includes(q) ||
      c.serial.toLowerCase().includes(q)       ||
      c.storeName.toLowerCase().includes(q)    ||
      c.type.toLowerCase().includes(q)         ||
      c.assetTag.toLowerCase().includes(q)     ||
      c.refrigerant.toLowerCase().includes(q)
    )
  }
  if (type) out = out.filter(c => c.type === type)

  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await req.json()

  const {
    type, manufacturer, model, serial, manualTitle, manualUrl,
    storeName, refrigerant, installDate, oilType, status,
    notes, lastServiceDate, assetTag, troubleshooting,
  } = body

  if (!type || !manufacturer || !model) {
    return NextResponse.json({ error: 'type, manufacturer and model are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('manual_components')
    .insert({
      type,
      manufacturer,
      model,
      serial:             serial          ?? '',
      manual_title:       manualTitle     ?? '',
      manual_url:         manualUrl       ?? '',
      store_name:         storeName       ?? '',
      rack_label:         '',
      refrigerant:        refrigerant     ?? '',
      install_date:       installDate     || null,
      oil_type:           oilType         ?? '',
      status:             status          ?? 'active',
      notes:              notes           ?? '',
      last_service_date:  lastServiceDate || null,
      asset_tag:          assetTag        ?? '',
      troubleshooting:    troubleshooting ?? '',
    })
    .select()
    .single()

  if (error) {
    console.error('[components POST] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseServer()
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Map camelCase → snake_case for DB
  const update: Record<string, unknown> = {}
  if ('manualTitle'     in fields) update.manual_title       = fields.manualTitle
  if ('manualUrl'       in fields) update.manual_url         = fields.manualUrl
  if ('refrigerant'     in fields) update.refrigerant        = fields.refrigerant
  if ('installDate'     in fields) update.install_date       = fields.installDate || null
  if ('oilType'         in fields) update.oil_type           = fields.oilType
  if ('status'          in fields) update.status             = fields.status
  if ('notes'           in fields) update.notes              = fields.notes
  if ('lastServiceDate' in fields) update.last_service_date  = fields.lastServiceDate || null
  if ('assetTag'        in fields) update.asset_tag          = fields.assetTag
  if ('troubleshooting' in fields) update.troubleshooting    = fields.troubleshooting
  if ('storeName'       in fields) update.store_name         = fields.storeName
  if ('manufacturer'    in fields) update.manufacturer       = fields.manufacturer
  if ('model'           in fields) update.model              = fields.model
  if ('serial'          in fields) update.serial             = fields.serial
  if ('type'            in fields) update.type               = fields.type

  const { data, error } = await supabase
    .from('manual_components')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[components PATCH] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
