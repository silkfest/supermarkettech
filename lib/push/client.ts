'use client'

// Browser-side helpers for the Web Push opt-in. Everything here is best-effort:
// push is a bonus, so a browser that doesn't support it should degrade quietly
// rather than error.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function isPushConfigured() {
  return Boolean(PUBLIC_KEY)
}

/** True when the page is running as an installed PWA rather than a browser tab.
 *  iOS only delivers Web Push to installed PWAs, so the UI uses this to explain
 *  why the toggle won't work in a plain Safari tab. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
}

export function isIOS() {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// VAPID keys travel as base64url but PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Ask permission, subscribe, and persist to the server.
 *  Returns an error string on failure, or null on success. */
export async function subscribeToPush(): Promise<string | null> {
  if (!isPushSupported()) return 'This browser does not support notifications.'
  if (!PUBLIC_KEY) return 'Push notifications are not configured on the server.'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return permission === 'denied'
      ? 'Notifications are blocked. Enable them for this site in your browser settings.'
      : 'Notification permission was dismissed.'
  }

  const reg = await navigator.serviceWorker.ready
  // Reuse an existing subscription if there is one — re-subscribing with a
  // different key throws.
  const sub = await reg.pushManager.getSubscription()
    ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    })

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return d.error ?? 'Could not save the subscription.'
  }
  return null
}

/** Unsubscribe this device and forget it server-side. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getExistingSubscription()
  if (!sub) return null

  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {})

  await sub.unsubscribe().catch(() => {})
  return null
}
