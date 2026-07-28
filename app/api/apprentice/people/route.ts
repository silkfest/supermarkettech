import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireRole } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

// Roles a course can be assigned to. Admins are omitted deliberately: they
// already see the entire catalogue, so assigning to them means nothing.
const DEFAULT_ROLES = ['apprentice', 'journeyman', 'manager']
const KNOWN_ROLES = ['apprentice', 'journeyman', 'manager', 'admin']

// GET /api/apprentice/people[?roles=journeyman,admin][&includeSelf=1]
//
// The roster a manager/admin needs when managing their team — who to assign a
// course to, who can be set as a mentor.
//
// This has to be a server route rather than a browser query. RLS on public.users
// allows a signed-in user to SELECT only their own row ("Users can view their own
// data" → auth.uid() = id), so client-side `from('users').in('role', [...])` calls
// always came back empty. In the assignment modal that looked like a broken search
// box rather than an empty list; in the mentor picker it looked like an empty
// dropdown. The service-role client here bypasses RLS, with requireRole applying
// the same manager/admin restriction the assignment endpoints use.
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)

  // Callers may narrow the roster (e.g. mentor candidates). Unknown role names
  // are dropped rather than passed straight into the query.
  const requested = (url.searchParams.get('roles') ?? '')
    .split(',')
    .map(r => r.trim())
    .filter(r => KNOWN_ROLES.includes(r))
  const roles = requested.length > 0 ? requested : DEFAULT_ROLES

  const includeSelf = url.searchParams.get('includeSelf') === '1'

  const { data, error } = await getSupabaseServer()
    .from('users')
    .select('id, name, email, role')
    .in('role', roles)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const people = includeSelf ? (data ?? []) : (data ?? []).filter(u => u.id !== auth.id)
  return NextResponse.json(people)
}
