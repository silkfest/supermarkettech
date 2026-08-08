import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

interface SubscribeBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

// POST /api/push/subscribe — register this browser for push notifications.
//
// Endpoints are unique, so re-subscribing the same device updates the existing
// row (browsers re-issue a subscription with the same endpoint on refresh, and
// may hand it to a different signed-in user on a shared device).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const body = (await req.json().catch(() => ({}))) as SubscribeBody
  const { endpoint, keys } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const { error } = await getSupabaseServer()
    .from('push_subscriptions')
    .upsert({
      user_id:    auth.id,
      endpoint,
      p256dh:     keys.p256dh,
      auth:       keys.auth,
      user_agent: req.headers.get('user-agent'),
    }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/push/subscribe — stop notifications for this browser.
// Scoped to the caller so one user can't unsubscribe another's device.
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { endpoint } = (await req.json().catch(() => ({}))) as SubscribeBody
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  const { error } = await getSupabaseServer()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', auth.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
