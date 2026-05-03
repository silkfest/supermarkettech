'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm text-center">
        <div className="flex items-baseline gap-0.5 justify-center mb-4">
          <span className="text-xl font-bold text-blue-600">Cold</span>
          <span className="text-xl font-bold text-slate-800">IQ</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 mb-1">Something went wrong</p>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          An unexpected error occurred. You can try again or reload the page.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[10px] text-slate-300">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
