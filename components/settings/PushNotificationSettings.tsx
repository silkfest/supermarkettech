'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react'
import {
  isPushSupported, isPushConfigured, isStandalone, isIOS,
  getExistingSubscription, subscribeToPush, unsubscribeFromPush,
} from '@/lib/push/client'

// Admin-only opt-in for access-request notifications. Subscriptions are
// per-device, so this reflects whether *this* browser is registered — an admin
// with a phone and a laptop enables it separately on each.
export default function PushNotificationSettings() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')

  const supported  = isPushSupported()
  const configured = isPushConfigured()
  // iOS refuses Web Push unless the PWA is installed to the home screen.
  const needsInstall = isIOS() && !isStandalone()

  useEffect(() => {
    void (async () => {
      const sub = await getExistingSubscription().catch(() => null)
      setEnabled(Boolean(sub))
      setLoading(false)
    })()
  }, [])

  async function toggle() {
    setBusy(true)
    setError('')
    const err = enabled ? await unsubscribeFromPush() : await subscribeToPush()
    if (err) setError(err)
    else setEnabled(!enabled)
    setBusy(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Get a notification on this device when someone requests access to ColdIQ.
      </p>

      {!configured ? (
        <p className="mt-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2 rounded-lg">
          Push notifications aren&apos;t configured on the server yet.
        </p>
      ) : !supported ? (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
          This browser doesn&apos;t support notifications.
        </p>
      ) : (
        <>
          {needsInstall && (
            <p className="mt-4 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-2 rounded-lg">
              <Smartphone size={14} className="flex-shrink-0 mt-0.5"/>
              <span>
                On iPhone and iPad, notifications only work once ColdIQ is installed to your
                home screen. Tap the Share icon, then <strong>Add to Home Screen</strong>, and
                turn this on from the installed app.
              </span>
            </p>
          )}

          <button
            onClick={toggle}
            disabled={busy || loading || needsInstall}
            className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              enabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {busy || loading
              ? <Loader2 size={15} className="animate-spin"/>
              : enabled ? <BellOff size={15}/> : <Bell size={15}/>}
            {loading ? 'Checking…' : enabled ? 'Turn off on this device' : 'Enable notifications'}
          </button>

          {enabled && !busy && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              This device will be notified about new access requests.
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </>
      )}
    </div>
  )
}
