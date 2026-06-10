import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabaseServer()

  const [storeResult, equipResult, pmResult] = await Promise.all([
    supabase.from('stores').select('*').eq('id', id).single(),
    supabase.from('equipment').select('*').eq('store_id', id).order('equipment_type').order('name'),
    supabase
      .from('pm_reports')
      .select('id, store_name, store_id, performed_at, report_type')
      .order('performed_at', { ascending: false })
      .limit(100),
  ])

  if (storeResult.error) return NextResponse.json({ error: storeResult.error.message }, { status: 404 })

  const store = storeResult.data as Record<string, unknown>
  const equipment = equipResult.data ?? []

  // Pull manual catalog rows for this store's equipment (used e.g. by Refrigeration PM
  // auto-fill to link compressor manuals by model)
  const equipmentIds = equipment.map((e: { id: string }) => e.id)
  let manualComponents: Record<string, unknown>[] = []
  if (equipmentIds.length > 0) {
    const { data: comps } = await supabase
      .from('manual_components')
      .select('equipment_id, type, manufacturer, model, document_id, documents(title)')
      .in('equipment_id', equipmentIds)
    manualComponents = comps ?? []
  }
  const compsByEquipment = new Map<string, Record<string, unknown>[]>()
  for (const c of manualComponents) {
    const eqId = c.equipment_id as string
    if (!compsByEquipment.has(eqId)) compsByEquipment.set(eqId, [])
    compsByEquipment.get(eqId)!.push(c)
  }
  const equipmentWithManuals = equipment.map((e: { id: string }) => ({
    ...e,
    manual_components: compsByEquipment.get(e.id) ?? [],
  }))

  // Match PMs by store_id (preferred) OR store_name fallback for older records
  const storePms = (pmResult.data ?? []).filter(
    (pm: { store_name: string; store_id: string | null }) =>
      pm.store_id === id || pm.store_name === store.name
  ).slice(0, 20)

  return NextResponse.json({
    ...store,
    equipment:   equipmentWithManuals,
    recent_pms:  storePms,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabaseServer()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if ('name'            in body) update.name             = body.name
  if ('address'         in body) update.address          = body.address
  if ('contactName'     in body) update.contact_name     = body.contactName
  if ('phone'           in body) update.phone            = body.phone
  if ('trendingIssues'  in body) update.trending_issues  = body.trendingIssues

  const { data, error } = await supabase
    .from('stores')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabaseServer()
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
