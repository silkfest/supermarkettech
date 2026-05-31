import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const MANAGER_ROLES = ['admin', 'manager']

async function checkManager(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return null
  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  return MANAGER_ROLES.includes(role) ? supabase : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await checkManager(req)
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.name       !== undefined) update.name       = body.name.trim()
  if (body.title      !== undefined) update.title      = body.title?.trim()  || null
  if (body.phone      !== undefined) update.phone      = body.phone?.trim()  || null
  if (body.email      !== undefined) update.email      = body.email?.trim()  || null
  if (body.notes      !== undefined) update.notes      = body.notes?.trim()  || null
  if (body.sort_order !== undefined) update.sort_order = body.sort_order

  const { data, error } = await supabase
    .from('directory_contacts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await checkManager(req)
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('directory_contacts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
