import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteAuth } from '@/lib/supabase/client'
import { z } from 'zod'
export async function dispatchAccess(req: NextRequest, write = false) {
  const db = getSupabaseRouteAuth(req)
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = req.nextUrl.searchParams.get('company')
  if (!z.string().uuid().safeParse(company).success)
    return NextResponse.json({ error: 'Choose a company' }, { status: 400 })
  const { data, error } = await db
    .from('company_memberships')
    .select('role')
    .eq('company_id', company!)
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (error)
    return NextResponse.json(
      { error: 'Dispatch is unavailable. Contact your administrator.' },
      { status: 503 },
    )
  if (!data || (write && !['admin', 'dispatcher'].includes(data.role)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { db, company: company!, role: data.role, userId: user.id }
}
export function databaseError(error: { code?: string }) {
  const invalid = ['23503', '23514', '42501'].includes(error.code ?? '')
  return NextResponse.json(
    {
      error: invalid
        ? 'Unable to save. Check company, technician, zone and overtime permissions.'
        : 'Dispatch is unavailable. Please try again.',
    },
    { status: invalid ? 400 : 503 },
  )
}
