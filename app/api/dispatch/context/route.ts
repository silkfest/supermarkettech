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
      userId: user.id,
      memberships: memberships.data,
      zones: [],
      priorities: [],
      technicians: [],
      zonePreference: [],
    })
  const access = await dispatchAccess(req)
  if (access instanceof NextResponse) return access
  const [zones, priorities, technicians, preference] = await Promise.all([
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
    db
      .from('dispatch_zone_preferences')
      .select('zones')
      .eq('company_id', access.company)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])
  // The preference table arrives with its own migration. Until that is applied
  // the board still has to load, so a table that is not there yet reads as "no
  // preference" — any other failure is a real one and still stops the request.
  const missingTable =
    preference.error?.code === '42P01' || preference.error?.code === 'PGRST205'
  const error =
    zones.error ||
    priorities.error ||
    technicians.error ||
    (missingTable ? null : preference.error)
  if (error) return databaseError(error)
  return NextResponse.json({
    // The board needs to know which requests are the viewer's own.
    userId: user.id,
    memberships: memberships.data,
    zones: zones.data,
    priorities: priorities.data,
    technicians: technicians.data,
    zonePreference: missingTable ? [] : (preference.data?.zones ?? []),
  })
}
