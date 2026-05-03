import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabaseServer()

  const [equipResult, pmResult] = await Promise.all([
    supabase.from('equipment').select('*, stores(name, address)').eq('id', id).single(),
    supabase
      .from('pm_reports')
      .select('id, store_name, performed_at, report_type')
      .eq('equipment_id', id)
      .order('performed_at', { ascending: false })
      .limit(20),
  ])

  if (equipResult.error) return NextResponse.json({ error: equipResult.error.message }, { status: 404 })

  return NextResponse.json({
    ...equipResult.data,
    pm_history: pmResult.data ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = getSupabaseServer()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if ('name'          in body) update.name           = body.name
  if ('equipmentType' in body) update.equipment_type = body.equipmentType
  if ('manufacturer'  in body) update.manufacturer   = body.manufacturer
  if ('model'         in body) update.model          = body.model
  if ('serialNumber'  in body) update.serial_number  = body.serialNumber
  if ('refrigerant'   in body) update.refrigerant    = body.refrigerant
  if ('installedAt'   in body) update.installed_at   = body.installedAt || null
  if ('location'      in body) update.location       = body.location
  if ('notes'         in body) update.notes          = body.notes
  if ('status'        in body) update.status         = body.status

  const { data, error } = await supabase
    .from('equipment')
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
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
