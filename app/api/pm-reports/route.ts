import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')
  const reportType = searchParams.get('type')

  let query = supabase
    .from('pm_reports')
    .select('*, technician:users(name, email)')
    .order('performed_at', { ascending: false })
    .limit(50)

  if (equipmentId) query = query.eq('equipment_id', equipmentId)
  if (reportType) query = query.eq('report_type', reportType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('pm_reports')
    .insert({
      equipment_id: body.equipment_id ?? null,
      store_id: body.store_id ?? null,
      technician_id: user.id,
      report_type: body.report_type,
      store_name: body.store_name,
      pm_season: body.pm_season ?? null,
      performed_at: body.performed_at ?? new Date().toISOString(),
      checklist: body.checklist ?? {},
      units: body.units ?? [],
      notes: body.notes ?? '',
      simpro_number: body.simpro_number ?? null,
      photos: body.photos ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
