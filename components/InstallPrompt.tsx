'use client'
import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

const DISMISS_KEY = 'coldiq_install_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    setDismissed(false)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) setShowIOSHint(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, '1')
    setDeferredPrompt(null)
    setDismissed(true)
  }

  if (dismissed || (!deferredPrompt && !showIOSHint)) return null

  return (
    <div className="fixed bottom-[calc(3.5rem+0.75rem+env(safe-area-inset-bottom))] left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:max-w-sm z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
        {deferredPrompt ? <Download size={16}/> : <Share size={16}/>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Install ColdIQ</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {deferredPrompt
            ? 'Add ColdIQ to your home screen for quick, full-screen access.'
            : 'Tap the Share icon, then "Add to Home Screen" for quick, full-screen access.'}
        </p>
        {deferredPrompt && (
          <button
            onClick={install}
            className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Install
          </button>
        )}
      </div>
      <button onClick={dismiss} className="flex-shrink-0 p-1 -mt-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Dismiss">
        <X size={14}/>
      </button>
    </div>
  )
}
