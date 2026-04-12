import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
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
  return NextResponse.json(data)
}
