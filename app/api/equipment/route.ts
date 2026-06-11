import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { requireRole } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()
  const storeId  = new URL(req.url).searchParams.get('storeId')

  let query = supabase.from('equipment').select('*').order('equipment_type').order('name')
  if (storeId) query = query.eq('store_id', storeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  if (rows.length === 0) return NextResponse.json([])

  // Enrich with the latest PM date per equipment (single query, group client-side)
  const equipIds = rows.map((e: { id: string }) => e.id)
  const { data: pmRows } = await supabase
    .from('pm_reports')
    .select('equipment_id, performed_at')
    .in('equipment_id', equipIds)
    .order('performed_at', { ascending: false })

  const lastPmByEquip: Record<string, string> = {}
  for (const pm of pmRows ?? []) {
    if (pm.equipment_id && !lastPmByEquip[pm.equipment_id]) {
      lastPmByEquip[pm.equipment_id] = pm.performed_at
    }
  }

  const enriched = rows.map((e: Record<string, unknown>) => ({
    ...e,
    last_pm_date: lastPmByEquip[e.id as string] ?? null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if (auth instanceof NextResponse) return auth
  const supabase = getSupabaseServer()
  const body = await req.json()
  const {
    storeId, name, equipmentType, manufacturer, model,
    serialNumber, refrigerant, installedAt, location, notes,
  } = body

  if (!storeId || !name?.trim()) {
    return NextResponse.json({ error: 'storeId and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('equipment')
    .insert({
      store_id:       storeId,
      name,
      equipment_type: equipmentType  ?? 'other',
      manufacturer:   manufacturer   ?? '',
      model:          model          ?? '',
      serial_number:  serialNumber   ?? '',
      refrigerant:    refrigerant    ?? '',
      installed_at:   installedAt    || null,
      location:       location       ?? '',
      notes:          notes          ?? '',
      status:         'UNKNOWN',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
