import { RELIEF_REFERENCES } from '@/lib/knowledge/relief-references'
import type { OpenPdfFn } from '../MarkdownContent'

export function ReliefReferences({ openPdf }: { openPdf?: OpenPdfFn }) {
  return <div className="space-y-3 my-4">
    <p className="text-xs text-slate-500 dark:text-slate-400">Primary references verified 14 October 2026. Check the current revision and exact installed model before service.</p>
    {RELIEF_REFERENCES.map(ref => <div key={ref.url} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 underline">{ref.title}</a>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{ref.scope}</p>
      {'localUrl' in ref && ref.localUrl && <button type="button" onClick={() => openPdf?.(ref.localUrl!, ref.title)} className="min-h-11 text-xs text-blue-600 dark:text-blue-400 underline">Read saved manufacturer PDF</button>}
    </div>)}
  </div>
}
