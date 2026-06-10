import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ROLE_LEVELS: Record<string, number> = {
  apprentice: 1,
  journeyman: 2,
  manager:    3,
  admin:      4,
}

// Which min_role values can a caller with this role see?
function allowedMinRoles(callerRole: string): string[] {
  const level = ROLE_LEVELS[callerRole] ?? 1
  return (['apprentice', 'journeyman', 'manager'] as const).filter(
    r => ROLE_LEVELS[r] <= level,
  )
}

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const callerRole = (profile as { role: string } | null)?.role ?? 'apprentice'

  const visible = allowedMinRoles(callerRole)

  const { data, error } = await supabase
    .from('contact_sections')
    .select('*, directory_contacts(*)')
    .in('min_role', visible)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort contacts within each section
  type Contact = { sort_order: number; created_at: string }
  const sections = (data ?? []).map((s: { directory_contacts?: Contact[] }) => ({
    ...s,
    directory_contacts: (s.directory_contacts ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    ),
  }))

  return NextResponse.json(sections)
}
