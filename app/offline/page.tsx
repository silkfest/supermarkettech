import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <WifiOff className="text-slate-400 dark:text-slate-500" size={28} />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This page isn&apos;t available without an internet connection. Reconnect and try again — pages you&apos;ve
          already visited may still work from cache.
        </p>
      </div>
    </div>
  )
}
