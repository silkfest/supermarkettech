'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Globe, Upload, CheckCircle, ExternalLink, Loader2, BookOpen, Link2 } from 'lucide-react'

interface DbDoc { id: string; title: string; source_type: string; created_at: string }
interface WebResult { title: string; url: string; source: string }
type Phase =
  | 'checking-db' | 'db-found' | 'db-empty'
  | 'web-searching' | 'web-results' | 'web-empty'
  | 'url-input' | 'uploading' | 'done'

interface Props {
  manufacturer: string
  model: string
  equipmentId?: string
  onClose: () => void
  onLinked: (doc: { id: string; title: string }) => void
}

export default function ManualFinderModal({ manufacturer, model, equipmentId, onClose, onLinked }: Props) {
  const [phase, setPhase]           = useState<Phase>('checking-db')
  const [dbResults, setDbResults]   = useState<DbDoc[]>([])
  const [webResults, setWebResults] = useState<WebResult[]>([])
  const [manualUrl, setManualUrl]   = useState('')
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState('')
  const [linked, setLinked]         = useState<{ id: string; title: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const label = [manufacturer, model].filter(Boolean).join(' ')

  // Auto-search existing library on mount
  useEffect(() => {
    if (!model && !manufacturer) { setPhase('db-empty'); return }
    const params = new URLSearchParams()
    if (model)        params.set('model', model)
    if (manufacturer) params.set('manufacturer', manufacturer)
    fetch(`/api/manuals/search-db?${params}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) { setDbResults(data); setPhase('db-found') }
        else setPhase('db-empty')
      })
      .catch(() => setPhase('db-empty'))
  }, [model, manufacturer])

  const searchWeb = async () => {
    setPhase('web-searching')
    const params = new URLSearchParams({ model, manufacturer })
    try {
      const data = await fetch(`/api/manuals/search-web?${params}`).then(r => r.json())
      if (Array.isArray(data) && data.length > 0) { setWebResults(data); setPhase('web-results') }
      else setPhase('web-empty')
    } catch { setPhase('web-empty') }
  }

  const importUrl = async (url: string, title?: string) => {
    setBusy(true); setError('')
    try {
      const res  = await fetch('/api/manuals/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, equipment_id: equipmentId, model, manufacturer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setLinked({ id: data.id, title: data.title })
      setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed') }
    finally { setBusy(false) }
  }

  const uploadFile = async (file: File) => {
    setBusy(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    if (equipmentId) fd.append('equipmentId', equipmentId)
    fd.append('title', label ? `${label} Manual` : file.name.replace(/\.pdf$/i, ''))
    try {
      const res  = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setLinked({ id: data.id, title: data.title })
      setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setBusy(false) }
  }

  const useDoc = (doc: DbDoc) => { setLinked({ id: doc.id, title: doc.title }); setPhase('done') }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800">
              {label ? `Manual — ${label}` : 'Find Manual'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 min-h-[180px]">

          {/* Checking DB */}
          {phase === 'checking-db' && (
            <div className="flex items-center gap-3 py-6 text-slate-500 text-sm">
              <Loader2 size={15} className="animate-spin text-blue-500" />
              Searching your manual library…
            </div>
          )}

          {/* Found in library */}
          {phase === 'db-found' && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 mb-3 flex items-center gap-1.5">
                <CheckCircle size={12} /> Found in your library
              </p>
              <div className="space-y-2">
                {dbResults.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {doc.source_type === 'WEB' ? 'Imported from web' : 'Uploaded'} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => useDoc(doc)}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                    >
                      <Link2 size={10} /> Use
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPhase('db-empty')}
                className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Not the right manual? Search elsewhere
              </button>
            </div>
          )}

          {/* Not in library — pick a method */}
          {phase === 'db-empty' && (
            <div>
              {model && (
                <p className="text-xs text-slate-500 mb-4">
                  No manual for <span className="font-medium">{model}</span> in your library yet. How would you like to add one?
                </p>
              )}
              <div className="space-y-2">
                {model && (
                  <button
                    onClick={searchWeb}
                    className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left active:scale-[0.99]"
                  >
                    <Globe size={18} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Search ManualsLib</p>
                      <p className="text-xs text-slate-500">Find and import a manual from the web</p>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => { setPhase('url-input'); setError('') }}
                  className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left active:scale-[0.99]"
                >
                  <Link2 size={18} className="text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Paste a PDF URL</p>
                    <p className="text-xs text-slate-500">Import directly from a direct link</p>
                  </div>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left active:scale-[0.99]"
                >
                  <Upload size={18} className="text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Upload a PDF</p>
                    <p className="text-xs text-slate-500">Upload a saved manual from your device</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Web searching */}
          {phase === 'web-searching' && (
            <div className="flex items-center gap-3 py-6 text-slate-500 text-sm">
              <Loader2 size={15} className="animate-spin text-blue-500" />
              Searching ManualsLib for <span className="font-medium text-slate-700">{label}</span>…
            </div>
          )}

          {/* Web results */}
          {phase === 'web-results' && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Select a manual to import</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {webResults.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 leading-snug">{r.title}</p>
                      <a
                        href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <ExternalLink size={9} /> View on ManualsLib
                      </a>
                    </div>
                    <button
                      onClick={() => importUrl(r.url, r.title)}
                      disabled={busy}
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={11} className="animate-spin" /> : 'Import'}
                    </button>
                  </div>
                ))}
              </div>
              {error && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="mt-3 flex gap-3 text-xs text-slate-400">
                <button onClick={() => { setPhase('url-input'); setError('') }} className="hover:text-slate-600 underline">Paste URL instead</button>
                <span>·</span>
                <button onClick={() => fileRef.current?.click()} className="hover:text-slate-600 underline">Upload a file</button>
              </div>
            </div>
          )}

          {/* Web empty */}
          {phase === 'web-empty' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">
                No results found for <span className="font-medium">{label}</span> on ManualsLib. Try a direct URL or upload a PDF.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPhase('url-input'); setError('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Link2 size={12} /> Paste URL
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Upload size={12} /> Upload
                </button>
              </div>
            </div>
          )}

          {/* URL input */}
          {phase === 'url-input' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Direct PDF URL</label>
                <input
                  autoFocus
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && manualUrl && !busy) importUrl(manualUrl) }}
                  placeholder="https://…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Paste a direct link to a PDF. The file will be downloaded and added to your library.
              </p>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => importUrl(manualUrl)}
                  disabled={!manualUrl || busy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : 'Import'}
                </button>
                <button
                  onClick={() => { setPhase('db-empty'); setError('') }}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && linked && (
            <div className="text-center py-4">
              <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 mb-1">Manual saved!</p>
              <p className="text-xs text-slate-600 mb-1 font-medium">{linked.title}</p>
              <p className="text-xs text-slate-400 mb-5">
                The AI will now use this manual when diagnosing this equipment.
              </p>
              <button
                onClick={() => onLinked(linked)}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}

          {/* Uploading spinner (when uploading via file picker) */}
          {busy && (phase === 'db-empty' || phase === 'uploading') && (
            <div className="flex items-center gap-3 py-4 text-slate-500 text-sm">
              <Loader2 size={15} className="animate-spin text-blue-500" />
              Uploading and processing PDF…
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />
      </div>
    </div>
  )
}
