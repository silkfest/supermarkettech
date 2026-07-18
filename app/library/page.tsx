'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Search, X, ExternalLink,
  FileText, Globe, Loader2, AlertTriangle, Pencil, Trash2, Check, RefreshCw, Sparkles, DownloadCloud,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { useConfirm } from '@/components/ConfirmDialog'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { formatBytes } from '@/lib/utils'

interface LibraryDoc {
  id: string
  title: string
  category: string
  status: string
  page_count: number | null
  file_size: number | null
  source_type: string
  source_url: string | null
  created_at: string
  equipment_id: string | null
  equipment_name: string | null
  signed_url: string | null
  chunk_count: number
  searchable: boolean
  index_error: string | null
}

interface Equipment {
  id: string
  name: string
}

const CATEGORY_COLOURS: Record<string, string> = {
  Compressor:   'bg-blue-50 text-blue-700 border-blue-200',
  Electrical:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  Controls:     'bg-violet-50 text-violet-700 border-violet-200',
  Components:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  General:      'bg-slate-100 text-slate-600 border-slate-200',
}

function categoryColour(cat: string) {
  return CATEGORY_COLOURS[cat] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

export default function LibraryPage() {
  const router = useRouter()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [docs,         setDocs]         = useState<LibraryDoc[]>([])
  const [equipment,    setEquipment]    = useState<Equipment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [assigning,    setAssigning]    = useState<Record<string, boolean>>({})
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editTitle,    setEditTitle]    = useState('')
  const [savingTitle,  setSavingTitle]  = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [reindexing,   setReindexing]   = useState(false)
  const [reindexDone,  setReindexDone]  = useState(false)
  const [reindexError, setReindexError] = useState<string | null>(null)
  const [processingDoc, setProcessingDoc] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const [webIndexing,     setWebIndexing]     = useState(false)
  const [webIndexStatus,  setWebIndexStatus]  = useState<string | null>(null)
  const [indexingDoc,     setIndexingDoc]     = useState<Record<string, 'loading' | 'done' | 'error'>>({})


  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (profile as { role?: string } | null)?.role ?? ''
      setIsAdmin(role === 'admin' || role === 'manager')
    }
    checkAuth()
  }, [router])

  const loadDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (search)         params.set('search', search)
    try {
      const res = await fetch(`/api/documents/library?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      setDocs(await res.json())
    } catch {
      setError('Could not load documents. Check your connection and try again.')
    }
    setLoading(false)
  }, [activeCategory, search])

  useEffect(() => { loadDocs() }, [loadDocs])

  useEffect(() => {
    fetch('/api/equipment').then(r => r.json()).then((data: Equipment[]) => {
      if (Array.isArray(data)) setEquipment(data)
    }).catch(() => {/* silent */})
  }, [])

  // Distinct categories from all docs (without search/category filter — load unfiltered once)
  const [allCategories, setAllCategories] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/documents/library').then(r => r.json()).then((data: LibraryDoc[]) => {
      if (Array.isArray(data)) {
        const cats = Array.from(new Set(data.map(d => d.category).filter(Boolean))).sort()
        setAllCategories(cats)
      }
    }).catch(() => {/* silent */})
  }, [])

  async function assignEquipment(docId: string, equipmentId: string | null) {
    setAssigning(a => ({ ...a, [docId]: true }))
    try {
      await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_id: equipmentId || null }),
      })
      // Update local state
      setDocs(prev => prev.map(d => d.id === docId
        ? {
            ...d,
            equipment_id:   equipmentId || null,
            equipment_name: equipment.find(e => e.id === equipmentId)?.name ?? null,
          }
        : d
      ))
    } catch { /* silent */ }
    setAssigning(a => ({ ...a, [docId]: false }))
  }

  async function saveTitle(docId: string) {
    if (!editTitle.trim()) return
    setSavingTitle(true)
    try {
      await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, title: editTitle.trim() } : d))
    } catch { /* silent */ }
    setSavingTitle(false)
    setEditingId(null)
  }

  async function deleteDoc(docId: string, title: string) {
    if (!await confirm({ message: `Delete "${title}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true })) return
    setDeletingId(docId)
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch { /* silent */ }
    setDeletingId(null)
  }

  // Index one web-linked doc so the AI chat can search it
  async function indexWebDoc(docId: string) {
    setIndexingDoc(p => ({ ...p, [docId]: 'loading' }))
    try {
      const res = await fetch('/api/documents/index-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Indexing failed')
      const result = json?.processed?.[0]
      if (result?.status !== 'indexed') throw new Error(result?.error ?? 'Indexing failed')
      setIndexingDoc(p => ({ ...p, [docId]: 'done' }))
      await loadDocs()
    } catch {
      setIndexingDoc(p => ({ ...p, [docId]: 'error' }))
      await loadDocs()
    }
    setTimeout(() => setIndexingDoc(p => { const n = { ...p }; delete n[docId]; return n }), 4000)
  }

  // Loop through every pending web-linked doc in server-side batches
  async function indexAllWebDocs() {
    setWebIndexing(true)
    setWebIndexStatus('Starting…')
    let indexed = 0
    let failed = 0
    try {
      for (let i = 0; i < 40; i++) {   // hard stop well above the pending count
        const res = await fetch('/api/documents/index-web', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: 5 }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? 'Indexing failed')
        const processed = (json?.processed ?? []) as Array<{ status: string }>
        indexed += processed.filter(p => p.status === 'indexed').length
        failed  += processed.filter(p => p.status === 'failed').length
        const remaining = json?.remaining ?? 0
        setWebIndexStatus(`${indexed} indexed${failed ? ` · ${failed} failed` : ''} · ${remaining} left`)
        if (remaining === 0 || processed.length === 0) break
      }
      setWebIndexStatus(`Done — ${indexed} indexed${failed ? `, ${failed} failed (see badges below)` : ''}`)
    } catch (e) {
      setWebIndexStatus(e instanceof Error ? e.message : 'Indexing failed')
    }
    setWebIndexing(false)
    await loadDocs()
  }

  async function processDoc(docId: string) {
    setProcessingDoc(p => ({ ...p, [docId]: 'loading' }))
    try {
      const res = await fetch(`/api/documents/${docId}/process`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setProcessingDoc(p => ({ ...p, [docId]: 'done' }))
      setTimeout(() => setProcessingDoc(p => { const n = { ...p }; delete n[docId]; return n }), 4000)
    } catch {
      setProcessingDoc(p => ({ ...p, [docId]: 'error' }))
      setTimeout(() => setProcessingDoc(p => { const n = { ...p }; delete n[docId]; return n }), 4000)
    }
  }

  return (
    <PageShell>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {confirmDialog}
      <PageHeader title="Manual Library" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Title + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600"/>
              Manual Library
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All manuals and documents across your stores</p>
          </div>
          {isAdmin && (
            <div className="flex flex-col items-end gap-1">
              {(() => {
                const pendingWeb = docs.filter(d =>
                  d.source_type === 'WEB' && !d.searchable && !d.index_error && d.source_url).length
                if (pendingWeb === 0 && !webIndexing && !webIndexStatus) return null
                return (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={indexAllWebDocs}
                      disabled={webIndexing || pendingWeb === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                      title="Fetch every web-linked manual and index it so the AI chat can search and cite it"
                    >
                      {webIndexing ? <Loader2 size={12} className="animate-spin"/> : <DownloadCloud size={12}/>}
                      {webIndexing ? 'Indexing web manuals…' : `Make ${pendingWeb} web manual${pendingWeb !== 1 ? 's' : ''} AI-searchable`}
                    </button>
                    {webIndexStatus && <p className="text-[10px] text-slate-500 dark:text-slate-400">{webIndexStatus}</p>}
                  </div>
                )
              })()}
              <button
                onClick={async () => {
                  setReindexing(true)
                  setReindexDone(false)
                  setReindexError(null)
                  try {
                    const res = await fetch('/api/admin/reindex', { method: 'POST' })
                    const json = await res.json()
                    if (!res.ok) throw new Error(json?.error ?? 'Reindex failed')
                    setReindexDone(true)
                    setTimeout(() => setReindexDone(false), 4000)
                  } catch (e) {
                    setReindexError(e instanceof Error ? e.message : 'Reindex failed')
                  } finally {
                    setReindexing(false)
                  }
                }}
                disabled={reindexing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 transition-colors"
                title="Re-process all manuals to update page-level citation links"
              >
                {reindexing
                  ? <Loader2 size={12} className="animate-spin"/>
                  : reindexDone
                    ? <Check size={12} className="text-emerald-500"/>
                    : <RefreshCw size={12}/>
                }
                {reindexing ? 'Re-indexing…' : reindexDone ? 'Done' : 'Re-index manuals'}
              </button>
              {reindexError && <p className="text-[10px] text-red-500">{reindexError}</p>}
            </div>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 w-full sm:w-48"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13}/>
              </button>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        {allCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button
              onClick={() => setActiveCategory('')}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                !activeCategory
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  activeCategory === cat
                    ? categoryColour(cat)
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            <span className="flex-1">{error}</span>
            <button onClick={loadDocs} className="font-medium underline hover:no-underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16 text-slate-400 dark:text-slate-500 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading library…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && docs.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={search || activeCategory ? 'No documents match your filters.' : 'No documents in the library yet.'}
          />
        )}

        {/* Document grid */}
        {!loading && docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3 group"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                  {doc.source_type === 'WEB'
                    ? <Globe size={16} className="text-blue-500"/>
                    : <FileText size={16} className="text-red-400"/>
                  }
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  {editingId === doc.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveTitle(doc.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 text-sm px-2 py-1 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-blue-500"
                      />
                      <button
                        onClick={() => saveTitle(doc.id)}
                        disabled={savingTitle}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex-shrink-0"
                        title="Save"
                      >
                        {savingTitle ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0"
                        title="Cancel"
                      >
                        <X size={13}/>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</p>
                      {doc.category && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${categoryColour(doc.category)}`}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {doc.page_count && <span className="text-xs text-slate-400 dark:text-slate-500">{doc.page_count}p</span>}
                    {doc.file_size  && <span className="text-xs text-slate-400 dark:text-slate-500">{formatBytes(doc.file_size)}</span>}
                    {!isAdmin && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {doc.equipment_name ? `📎 ${doc.equipment_name}` : 'Unassigned'}
                      </span>
                    )}
                  </div>
                  {/* Admin: assign to equipment — visible on all screen sizes */}
                  {isAdmin && (
                    <div className="mt-1.5">
                      {assigning[doc.id] ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Loader2 size={12} className="animate-spin"/> Assigning…
                        </div>
                      ) : (
                        <select
                          value={doc.equipment_id ?? ''}
                          onChange={e => assignEquipment(doc.id, e.target.value || null)}
                          className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-44"
                          title="Assign to equipment"
                        >
                          <option value="">Unassigned</option>
                          {equipment.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Status badge for non-READY docs */}
                {doc.status !== 'READY' && (
                  <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    doc.status === 'PROCESSING'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                  }`}>
                    {doc.status}
                  </span>
                )}

                {/* AI-search health: READY but never indexed = invisible to chat */}
                {doc.status === 'READY' && !doc.searchable && (
                  <span
                    className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                    title={doc.index_error ?? 'The AI chat cannot search this manual yet — it has not been indexed'}
                  >
                    {doc.index_error ? 'Index failed' : 'Not AI-searchable'}
                  </span>
                )}

                {/* Admin actions: index-for-chat + process + rename + delete */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.source_type === 'WEB' && !doc.searchable && doc.source_url && (
                      <button
                        onClick={() => indexWebDoc(doc.id)}
                        disabled={!!indexingDoc[doc.id] || webIndexing}
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Fetch this manual and index it so the AI chat can search it"
                      >
                        {indexingDoc[doc.id] === 'loading'
                          ? <Loader2 size={14} className="animate-spin text-blue-500"/>
                          : indexingDoc[doc.id] === 'done'
                            ? <Check size={14} className="text-emerald-500"/>
                            : indexingDoc[doc.id] === 'error'
                              ? <AlertTriangle size={14} className="text-red-500"/>
                              : <DownloadCloud size={14}/>
                        }
                      </button>
                    )}
                    <button
                      onClick={() => processDoc(doc.id)}
                      disabled={!!processingDoc[doc.id]}
                      className="p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Generate knowledge topics from this manual"
                    >
                      {processingDoc[doc.id] === 'loading'
                        ? <Loader2 size={14} className="animate-spin text-amber-500"/>
                        : processingDoc[doc.id] === 'done'
                          ? <Check size={14} className="text-emerald-500"/>
                          : processingDoc[doc.id] === 'error'
                            ? <AlertTriangle size={14} className="text-red-500"/>
                            : <Sparkles size={14}/>
                      }
                    </button>
                    <button
                      onClick={() => { setEditingId(doc.id); setEditTitle(doc.title) }}
                      className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Pencil size={14}/>
                    </button>
                    <button
                      onClick={() => deleteDoc(doc.id, doc.title)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      {deletingId === doc.id
                        ? <Loader2 size={14} className="animate-spin"/>
                        : <Trash2 size={14}/>
                      }
                    </button>
                  </div>
                )}

                {/* Open link */}
                {doc.signed_url && (
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Open document"
                  >
                    <ExternalLink size={15}/>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PageShell>
  )
}
