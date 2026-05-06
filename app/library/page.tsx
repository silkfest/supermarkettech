'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, ArrowLeft, BookOpen, Search, X, ExternalLink,
  FileText, Globe, Loader2, AlertTriangle, Pencil, Trash2, Check,
} from 'lucide-react'
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
  created_at: string
  equipment_id: string | null
  equipment_name: string | null
  signed_url: string | null
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
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(docId)
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch { /* silent */ }
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600" title="Dashboard">
          <Home size={18}/>
        </button>
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18}/>
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-700">Manual Library</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title + search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600"/>
              Manual Library
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">All manuals and documents across your stores</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44"
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
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
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
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            <span className="flex-1">{error}</span>
            <button onClick={loadDocs} className="font-medium underline hover:no-underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading library…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={32} className="text-slate-200 mb-3"/>
            <p className="text-sm text-slate-400">
              {search || activeCategory ? 'No documents match your filters.' : 'No documents in the library yet.'}
            </p>
          </div>
        )}

        {/* Document grid */}
        {!loading && docs.length > 0 && (
          <div className="space-y-2">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 group"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
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
                        className="flex-1 text-sm px-2 py-1 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
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
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      {doc.category && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${categoryColour(doc.category)}`}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {doc.page_count && <span className="text-xs text-slate-400">{doc.page_count}p</span>}
                    {doc.file_size  && <span className="text-xs text-slate-400">{formatBytes(doc.file_size)}</span>}
                    <span className="text-xs text-slate-400">
                      {doc.equipment_name ? `📎 ${doc.equipment_name}` : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Admin actions: assign + rename + delete */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {assigning[doc.id] ? (
                      <Loader2 size={14} className="animate-spin text-slate-400"/>
                    ) : (
                      <select
                        value={doc.equipment_id ?? ''}
                        onChange={e => assignEquipment(doc.id, e.target.value || null)}
                        className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px] truncate"
                        title="Assign to equipment"
                      >
                        <option value="">Unassigned</option>
                        {equipment.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name}</option>
                        ))}
                      </select>
                    )}
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
  )
}
