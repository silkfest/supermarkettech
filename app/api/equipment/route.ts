import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const storeId  = new URL(req.url).searchParams.get('storeId')

  let query = supabase.from('equipment').select('*').order('equipment_type').order('name')
  if (storeId) query = query.eq('store_id', storeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
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
