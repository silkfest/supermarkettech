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
  const { section_id, name, title, phone, email, notes, sort_order } = body
  if (!section_id) return NextResponse.json({ error: 'section_id is required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('directory_contacts')
    .insert({
      section_id,
      name:       name.trim(),
      title:      title?.trim()  || null,
      phone:      phone?.trim()  || null,
      email:      email?.trim()  || null,
      notes:      notes?.trim()  || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
