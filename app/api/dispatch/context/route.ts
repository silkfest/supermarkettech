import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteAuth } from '@/lib/supabase/client'
import { dispatchAccess, databaseError } from '@/lib/dispatch/server'
export async function GET(req: NextRequest) {
  const db = getSupabaseRouteAuth(req)
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberships = await db
    .from('company_memberships')
    .select('company_id,role,companies(name)')
    .eq('user_id', user.id)
    .eq('active', true)
  if (memberships.error) return databaseError(memberships.error)
  if (!req.nextUrl.searchParams.has('company'))
    return NextResponse.json({
      memberships: memberships.data,
      zones: [],
      priorities: [],
      technicians: [],
    })
  const access = await dispatchAccess(req)
  if (access instanceof NextResponse) return access
  const [zones, priorities, technicians] = await Promise.all([
    db
      .from('dispatch_zones')
      .select('code,name')
      .eq('company_id', access.company)
      .order('code'),
    db
      .from('dispatch_priorities')
      .select('level,label,emergency,response_hours,overtime_approved')
      .eq('company_id', access.company)
      .order('level'),
    db
      .from('company_memberships')
      .select('user_id,display_name')
      .eq('company_id', access.company)
      .eq('active', true)
      .eq('role', 'technician')
      .order('display_name'),
  ])
  const error = zones.error || priorities.error || technicians.error
  if (error) return databaseError(error)
  return NextResponse.json({
    memberships: memberships.data,
    zones: zones.data,
    priorities: priorities.data,
    technicians: technicians.data,
  })
}
