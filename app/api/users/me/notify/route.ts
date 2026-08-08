import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { notifyAdmins } from '@/lib/push/send'

const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: me } = await supabase
    .from('users')
    .select('name,email,status,notify_requested_at')
    .eq('id', user.id)
    .single()

  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (me.status !== 'pending') {
    return NextResponse.json({ error: 'Account is not pending approval' }, { status: 400 })
  }

  if (me.notify_requested_at) {
    const elapsed = Date.now() - new Date(me.notify_requested_at).getTime()
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Please wait before requesting again', notifyRequestedAt: me.notify_requested_at },
        { status: 429 }
      )
    }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('users')
    .update({ notify_requested_at: now })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Until now this endpoint only stamped a timestamp for the admin to notice
  // in-app — the "notify an admin" button didn't actually reach anyone. Push it.
  notifyAdmins({
    title: 'Access request reminder',
    body: `${me.name ?? me.email} is still waiting for approval.`,
    url: '/admin/users',
    tag: `access-request-${user.id}`,
  }).catch(err => console.error('[push] access-request reminder failed', err))

  return NextResponse.json({ notifyRequestedAt: now })
}
