'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  Home, ArrowLeft, FileText, Plus, Pencil, Trash2,
  ExternalLink, Loader2, X, Check, AlertTriangle,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'company_policy',  label: 'Company Policies',   icon: '🏢', desc: 'HR handbook, benefits, workplace policies' },
  { key: 'store_procedure', label: 'Store Procedures',   icon: '🏪', desc: 'Site-specific refrigeration & HVAC procedures' },
  { key: 'oncall',          label: 'On-Call Schedule',   icon: '📅', desc: 'On-call rotation and contact information' },
  { key: 'truck_stock',     label: 'Truck Stock List',   icon: '🚐', desc: 'Required parts and supplies for service trucks' },
]

const STORES  = ['Sobeys', 'Loblaws', 'Metro', 'CK']
const TRADES  = [
  { key: 'general',       label: 'General' },
  { key: 'refrigeration', label: 'Refrigeration' },
  { key: 'hvac',          label: 'HVAC' },
]

const CAT_COLOURS: Record<string, string> = {
  company_policy:  'bg-blue-50 text-blue-700 border-blue-200',
  store_procedure: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  oncall:          'bg-amber-50 text-amber-700 border-amber-200',
  truck_stock:     'bg-slate-100 text-slate-600 border-slate-200',
}
const TRADE_COLOURS: Record<string, string> = {
  refrigeration: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  hvac:          'bg-orange-50 text-orange-700 border-orange-200',
  general:       '',
}
const STORE_COLOURS: Record<string, string> = {
  Sobeys:  'bg-red-50 text-red-700 border-red-200',
  Loblaws: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Metro:   'bg-blue-50 text-blue-700 border-blue-200',
  CK:      'bg-purple-50 text-purple-700 border-purple-200',
}

interface Policy {
  id: string; title: string; description: string
  category: string; store: string; trade: string
  url: string; sort_order: number; is_published: boolean; created_at: string
}

// ─── Add / Edit modal ──────────────────────────────────────────────────────────
function PolicyModal({ initial, onSave, onClose }: {
  initial?: Policy | null
  onSave: (p: Policy) => void
  onClose: () => void
}) {
  const [title,    setTitle]    = useState(initial?.title       ?? '')
  const [desc,     setDesc]     = useState(initial?.description ?? '')
  const [category, setCat]      = useState(initial?.category    ?? 'company_policy')
  const [store,    setStore]    = useState(initial?.store       ?? '')
  const [trade,    setTrade]    = useState(initial?.trade       ?? 'general')
  const [url,      setUrl]      = useState(initial?.url         ?? '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const method   = initial ? 'PATCH' : 'POST'
    const endpoint = initial ? `/api/policies/${initial.id}` : '/api/policies'
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, category, store, trade, url }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSave(await res.json())
  }

  const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const lbl = 'block text-xs font-medium text-slate-700 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">{initial ? 'Edit Policy' : 'Add Policy / Document'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}
          <div>
            <label className={lbl}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Sobeys Refrigeration Lockout Procedure" />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inp} placeholder="Brief description of what this document covers…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Category</label>
              <select value={category} onChange={e => { setCat(e.target.value); if (e.target.value !== 'store_procedure') setStore('') }} className={inp}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Trade</label>
              <select value={trade} onChange={e => setTrade(e.target.value)} className={inp}>
                {TRADES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>
          {category === 'store_procedure' && (
            <div>
              <label className={lbl}>Store</label>
              <select value={store} onChange={e => setStore(e.target.value)} className={inp}>
                <option value="">All Stores</option>
                {STORES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={lbl}>Link / URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} className={inp} placeholder="https://… (Google Doc, SharePoint, PDF link…)" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PoliciesPage() {
  const router = useRouter()

  const [policies,      setPolicies]      = useState<Policy[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [isAdmin,       setIsAdmin]       = useState(false)
  const [activeTab,     setActiveTab]     = useState('company_policy')
  const [storeFilter,   setStoreFilter]   = useState('')
  const [tradeFilter,   setTradeFilter]   = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (profile as { role?: string } | null)?.role ?? ''
      setIsAdmin(['admin', 'manager', 'journeyman'].includes(role))
    }
    checkAuth()
  }, [router])

  const loadPolicies = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/policies')
      if (!res.ok) throw new Error('Failed')
      setPolicies(await res.json())
    } catch {
      setError('Could not load policies. Check your connection and try again.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPolicies() }, [loadPolicies])

  async function deletePolicy(id: string) {
    if (!confirm('Delete this policy?')) return
    setDeletingId(id)
    await fetch(`/api/policies/${id}`, { method: 'DELETE' })
    setPolicies(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  function handleSaved(saved: Policy) {
    if (editingPolicy) {
      setPolicies(prev => prev.map(p => p.id === saved.id ? saved : p))
    } else {
      setPolicies(prev => [...prev, saved])
    }
    setShowModal(false)
    setEditingPolicy(null)
  }

  // Filter to active tab
  const tabPolicies = policies.filter(p => {
    if (p.category !== activeTab) return false
    if (storeFilter && p.store !== storeFilter && p.store !== '') return false
    if (tradeFilter && p.trade !== tradeFilter) return false
    return true
  })

  const activeCat = CATEGORIES.find(c => c.key === activeTab)!

  return (
    <div className="min-h-screen bg-slate-50">
      {(showModal || editingPolicy) && (
        <PolicyModal
          initial={editingPolicy}
          onSave={handleSaved}
          onClose={() => { setShowModal(false); setEditingPolicy(null) }}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600"><Home size={18}/></button>
        <button onClick={() => router.back()}             className="text-slate-400 hover:text-slate-600"><ArrowLeft size={18}/></button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-700">Policies &amp; Procedures</span>
        {isAdmin && (
          <button
            onClick={() => { setEditingPolicy(null); setShowModal(true) }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
          >
            <Plus size={13}/> Add
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">

        {/* Category tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CATEGORIES.map(cat => {
            const count = policies.filter(p => p.category === cat.key).length
            const active = activeTab === cat.key
            return (
              <button key={cat.key} onClick={() => { setActiveTab(cat.key); setStoreFilter(''); setTradeFilter('') }}
                className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all ${
                  active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-lg">{cat.icon}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </div>
                <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-slate-700'}`}>{cat.label}</p>
              </button>
            )
          })}
        </div>

        {/* Sub-filters for store procedures */}
        {activeTab === 'store_procedure' && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setStoreFilter('')}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${!storeFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                All Stores
              </button>
              {STORES.map(s => (
                <button key={s} onClick={() => setStoreFilter(storeFilter === s ? '' : s)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${storeFilter === s ? `${STORE_COLOURS[s]} border` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TRADES.map(t => (
                <button key={t.key} onClick={() => setTradeFilter(tradeFilter === t.key ? '' : t.key)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    tradeFilter === t.key ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            <span className="flex-1">{error}</span>
            <button onClick={loadPolicies} className="font-medium underline hover:no-underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12 text-slate-400 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading…
          </div>
        )}

        {/* Section header */}
        {!loading && (
          <div className="flex items-start gap-3">
            <span className="text-2xl">{activeCat.icon}</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">{activeCat.label}</h2>
              <p className="text-xs text-slate-500">{activeCat.desc}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tabPolicies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-slate-200 rounded-2xl">
            <span className="text-4xl mb-3">{activeCat.icon}</span>
            <p className="text-sm text-slate-500">No documents in this section yet.</p>
            {isAdmin && <p className="text-xs text-slate-400 mt-1">Click &ldquo;+ Add&rdquo; in the header to add the first one.</p>}
          </div>
        )}

        {/* Policy list */}
        {!loading && tabPolicies.length > 0 && (
          <div className="space-y-2">
            {tabPolicies.map(policy => (
              <div key={policy.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={16} className="text-slate-500"/>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-slate-800">{policy.title}</p>
                    {policy.store && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STORE_COLOURS[policy.store] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {policy.store}
                      </span>
                    )}
                    {policy.trade !== 'general' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TRADE_COLOURS[policy.trade] ?? ''}`}>
                        {TRADES.find(t => t.key === policy.trade)?.label}
                      </span>
                    )}
                  </div>
                  {policy.description && <p className="text-xs text-slate-500 leading-relaxed">{policy.description}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {policy.url && (
                    <a href={policy.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Open document">
                      <ExternalLink size={15}/>
                    </a>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => { setEditingPolicy(policy); setShowModal(true) }}
                        className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => deletePolicy(policy.id)} disabled={deletingId === policy.id}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40" title="Delete">
                        {deletingId === policy.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
