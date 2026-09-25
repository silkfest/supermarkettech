import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { notifyAdmins } from '@/lib/push/send'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .from('users')
    .select('id,name,email,role,status,created_at,notify_requested_at,admin_notified_at')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // First time a pending user loads their own profile, alert the admins.
  //
  // This is the right moment rather than at sign-up: the public.users row is
  // created by the on_auth_user_created trigger the instant someone submits the
  // registration form, but email confirmation is required before they can reach
  // this endpoint. Notifying here means abandoned or bot sign-ups that never
  // confirm don't page anyone. admin_notified_at keeps it to once per user.
  if (data.status === 'pending' && !data.admin_notified_at) {
    await supabase
      .from('users')
      .update({ admin_notified_at: new Date().toISOString() })
      .eq('id', user.id)

    // Fire-and-forget: a push failure must not break the pending screen.
    notifyAdmins({
      title: 'New access request',
      body: `${data.name ?? data.email} is waiting for approval.`,
      url: '/admin/users',
      tag: `access-request-${user.id}`,
    }).catch(err => console.error('[push] access-request notify failed', err))
  }

  return NextResponse.json(data)
}
