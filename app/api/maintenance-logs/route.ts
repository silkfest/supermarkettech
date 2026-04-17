import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get('equipmentId')

  let query = supabase
    .from('maintenance_logs')
    .select(`
      id,
      equipment_id,
      technician_id,
      title,
      notes,
      work_done,
      next_action,
      performed_at,
      created_at,
      users:technician_id ( name, role )
    `)
    .order('performed_at', { ascending: false })
    .limit(50)

  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { equipment_id, title, notes, work_done, next_action, performed_at } = body

  if (!equipment_id || !title) {
    return NextResponse.json({ error: 'equipment_id and title are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert({
      equipment_id,
      technician_id: user.id,
      title,
      notes: notes ?? null,
      work_done: work_done ?? null,
      next_action: next_action ?? null,
      performed_at: performed_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
