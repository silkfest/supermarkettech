'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, MapPin, Wrench, ChevronRight, Plus, X, ArrowLeft,
  Calendar, Package,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface StoreCard {
  id: string
  name: string
  address: string
  contact_name: string
  phone: string
  trending_issues: string
  equipment_count: number
  last_pm_date: string | null
  updated_at: string
}

interface AddForm {
  name: string
  address: string
  contactName: string
  phone: string
  trendingIssues: string
}

const EMPTY_FORM: AddForm = {
  name: '', address: '', contactName: '', phone: '', trendingIssues: '',
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function StoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<StoreCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('users').select('role').eq('id', user.id).single()
      const profileRole = (profileData as { role?: string } | null)?.role
      setIsAdmin(profileRole === 'admin' || profileRole === 'manager')

      const res = await fetch('/api/stores')
      if (res.ok) setStores(await res.json())
      setLoading(false)
    }
    init()
  }, [router])

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const created = await res.json()
      setStores(prev => [...prev, { ...created, equipment_count: 0, last_pm_date: null }])
      setForm(EMPTY_FORM)
      setShowAdd(false)
    }
    setSaving(false)
  }

  const filtered = stores.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.address ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900">Sites</h1>
          <p className="text-xs text-slate-500">{stores.length} location{stores.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} /> Add site
          </button>
        )}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Search */}
        <input
          type="text"
          placeholder="Search sites…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Building2 size={36} className="mb-2 opacity-30" />
            <p className="text-sm">{search ? 'No sites match your search' : 'No sites yet'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(store => (
              <button
                key={store.id}
                onClick={() => router.push(`/stores/${store.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{store.name}</p>
                      <ChevronRight size={15} className="text-slate-400 flex-shrink-0" />
                    </div>
                    {store.address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500 truncate">{store.address}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Package size={11} />
                        {store.equipment_count} unit{store.equipment_count !== 1 ? 's' : ''}
                      </span>
                      {store.last_pm_date && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Wrench size={11} />
                          PM {fmtDate(store.last_pm_date)}
                        </span>
                      )}
                      {store.contact_name && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {store.contact_name}
                        </span>
                      )}
                    </div>
                    {store.trending_issues && (
                      <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 line-clamp-2">
                        ⚠ {store.trending_issues}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Site Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Add site</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-6 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Site name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Loblaws Yonge & Eg"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, Toronto, ON"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact name</label>
                  <input
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Store manager"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="416-555-0100"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trending issues</label>
                <textarea
                  value={form.trendingIssues}
                  onChange={e => setForm(f => ({ ...f, trendingIssues: e.target.value }))}
                  placeholder="Known recurring issues at this site…"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="mt-1 w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Add site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
