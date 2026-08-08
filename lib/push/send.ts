import webpush from 'web-push'
import { getSupabaseServer } from '@/lib/supabase/client'

// VAPID keys identify this server to the browser push services. Generate a pair
// with `npx web-push generate-vapid-keys` and set them in the environment:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  (public — also read by the browser to subscribe)
//   VAPID_PRIVATE_KEY             (secret — server only)
//   VAPID_SUBJECT                 (optional; a mailto: or https: contact URL)
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const SUBJECT     = process.env.VAPID_SUBJECT ?? 'mailto:admin@coldiq.app'

/** Push is optional infrastructure — if the keys aren't configured the app must
 *  keep working, just without notifications. Callers check this before sending. */
export function isPushConfigured() {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY)
}

let configured = false
function ensureConfigured() {
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
    configured = true
  }
}

export interface PushPayload {
  title: string
  body: string
  /** Path opened when the notification is clicked. */
  url?: string
  /** Collapses same-tag notifications so repeats replace rather than stack. */
  tag?: string
}

/**
 * Send a notification to every push subscription belonging to `userIds`.
 *
 * Subscriptions expire and devices get wiped, so a 404/410 from the push service
 * means the subscription is permanently dead — those rows are deleted rather
 * than retried forever. Any other failure is logged and skipped; a broken
 * notification must never take down the request that triggered it.
 *
 * Returns counts so callers can log the outcome. Never throws.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, failed: 0, pruned: 0 }

  const supabase = getSupabaseServer()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return { sent: 0, failed: 0, pruned: 0 }

  ensureConfigured()
  const body = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0
  let failed = 0

  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        dead.push(sub.id)
      } else {
        failed++
        console.error('[push] send failed', status, (err as Error).message)
      }
    }
  }))

  if (dead.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', dead)
  }

  return { sent, failed, pruned: dead.length }
}

/** Every admin who has at least one registered device. */
export async function notifyAdmins(payload: PushPayload) {
  const { data: admins } = await getSupabaseServer()
    .from('users')
    .select('id')
    .eq('role', 'admin')

  return sendPushToUsers((admins ?? []).map(a => a.id), payload)
}
