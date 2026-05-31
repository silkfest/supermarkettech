import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const MANAGER_ROLES = ['admin', 'manager']

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!MANAGER_ROLES.includes((profile as { role: string } | null)?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, min_role, sort_order } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!['apprentice', 'journeyman', 'manager'].includes(min_role))
    return NextResponse.json({ error: 'Invalid min_role' }, { status: 400 })

  const { data, error } = await supabase
    .from('contact_sections')
    .insert({ title: title.trim(), description: description?.trim() || null, min_role, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, directory_contacts: [] }, { status: 201 })
}
