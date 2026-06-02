'use client'

import { BookOpen } from 'lucide-react'
import type { OpenPdfFn } from '../MarkdownContent'

const MANUAL_ID = '6e9fabe4-f289-453f-899a-1637b96ffdcb'
const MANUAL_TITLE = 'Hussmann Parallel Rack Systems'

export function RackStyle1Diagram({ openPdf }: { openPdf?: OpenPdfFn }) {
  const url = `/api/pdf?docId=${MANUAL_ID}`

  function handleClick() {
    if (openPdf) {
      openPdf(url, MANUAL_TITLE)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="my-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
        <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
          Rack Style 1 Schematic
        </p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{MANUAL_TITLE}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Full circuit P&amp;ID — compressors, oil separator, receiver, evaporators</p>
      </div>
      <button
        onClick={handleClick}
        className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        Open Manual
      </button>
    </div>
  )
}
