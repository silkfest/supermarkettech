import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ROLE_LEVEL: Record<string, number> = {
  apprentice: 1, journeyman: 2, manager: 3, admin: 4,
}

function allowedMinRoles(userLevel: number): string[] {
  return Object.entries(ROLE_LEVEL)
    .filter(([, level]) => level <= userLevel)
    .map(([role]) => role)
}

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? 'apprentice'
  const userLevel = ROLE_LEVEL[role] ?? 1
  const allowed = allowedMinRoles(userLevel)

  const { data, error } = await supabase
    .from('contact_sections')
    .select('*, directory_contacts(*)')
    .in('min_role', allowed)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
