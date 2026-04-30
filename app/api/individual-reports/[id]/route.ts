import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .from('individual_reports')
    .select('*, technician:users(name, email)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

async function canMutateReport(supabase: ReturnType<typeof getSupabaseServer>, userId: string, reportId: string) {
  const [reportRes, callerRes] = await Promise.all([
    supabase.from('individual_reports').select('technician_id').eq('id', reportId).single(),
    supabase.from('users').select('role').eq('id', userId).single(),
  ])
  const role = (callerRes.data as { role: string } | null)?.role
  const ownerId = (reportRes.data as { technician_id: string } | null)?.technician_id
  return userId === ownerId || role === 'admin' || role === 'manager'
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()

  if (!await canMutateReport(supabase, user.id, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('individual_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()

  if (!await canMutateReport(supabase, user.id, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['store_name', 'performed_at', 'issue_explanation', 'steps_taken', 'whats_next', 'simpro_number', 'parts_needed', 'photos']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) { if (key in body) patch[key] = body[key] }

  const { data, error } = await supabase
    .from('individual_reports')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
