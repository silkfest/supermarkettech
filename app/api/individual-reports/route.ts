import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')
  const storeId = searchParams.get('storeId')

  let query = supabase
    .from('individual_reports')
    .select('*, technician:users(name, email)')
    .order('performed_at', { ascending: false })
    .limit(50)

  if (equipmentId) query = query.eq('equipment_id', equipmentId)
  if (storeId) query = query.eq('store_id', storeId)

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
    .from('individual_reports')
    .insert({
      equipment_id: body.equipment_id ?? null,
      store_id: body.store_id ?? null,
      technician_id: user.id,
      store_name: body.store_name,
      performed_at: body.performed_at ?? new Date().toISOString(),
      issue_explanation: body.issue_explanation ?? null,
      steps_taken: body.steps_taken ?? null,
      whats_next: body.whats_next ?? null,
      simpro_number: body.simpro_number ?? null,
      parts_needed: body.parts_needed ?? [],
      photos: body.photos ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
