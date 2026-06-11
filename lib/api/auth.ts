import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export interface AuthedUser {
  id: string
}

export interface AuthedUserWithRole extends AuthedUser {
  role: string
}

/** Requires a signed-in user. Returns { id } on success, or a 401 NextResponse
 *  the route handler should return directly:
 *    const auth = await requireUser(req)
 *    if (auth instanceof NextResponse) return auth */
export async function requireUser(req: NextRequest): Promise<AuthedUser | NextResponse> {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return { id: user.id }
}

/** Requires a signed-in user whose users.role is in `roles`. Returns { id, role }
 *  on success, or a 401/403 NextResponse the route handler should return directly. */
export async function requireRole(
  req: NextRequest,
  roles: string[],
): Promise<AuthedUserWithRole | NextResponse> {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { data } = await getSupabaseServer().from('users').select('role').eq('id', auth.id).single()
  const role = (data as { role?: string } | null)?.role ?? ''
  if (!roles.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { id: auth.id, role }
}
