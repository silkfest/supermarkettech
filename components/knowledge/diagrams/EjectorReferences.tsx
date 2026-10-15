import { EJECTOR_REFERENCES } from '@/lib/knowledge/ejector-references'

export function EjectorReferences() {
  return <div className="my-4 space-y-3">{EJECTOR_REFERENCES.map(ref =>
    <a key={ref.url} href={ref.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
      <span className="font-semibold text-blue-600 dark:text-blue-400">{ref.title} ↗</span>
      <span className="block mt-1 text-slate-600 dark:text-slate-400">{ref.scope}</span>
    </a>
  )}</div>
}
