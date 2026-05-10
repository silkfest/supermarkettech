import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')
  const supabase = getSupabaseServer()

  const query = supabase
    .from('alarm_events')
    .select('*, equipment:equipment(name, manufacturer, model)')
    .is('resolved_at', null)
    .order('triggered_at', { ascending: false })

  if (equipmentId) query.eq('equipment_id', equipmentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, resolution } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('alarm_events')
    .update({ resolved_at: new Date().toISOString(), resolution: resolution ?? 'Resolved' })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-update equipment status based on remaining unresolved alarms
  if (data?.equipment_id) {
    const { data: remaining } = await supabase
      .from('alarm_events')
      .select('severity')
      .eq('equipment_id', data.equipment_id)
      .is('resolved_at', null)

    const alarms = remaining ?? []
    let newStatus = 'OK'
    if (alarms.some(a => a.severity === 'CRITICAL')) newStatus = 'ALARM'
    else if (alarms.some(a => a.severity === 'WARNING')) newStatus = 'WARNING'

    await supabase
      .from('equipment')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', data.equipment_id)
  }

  return NextResponse.json(data)
}
