'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  Home, FileText, Plus, Pencil, Trash2, ExternalLink,
  Loader2, X, AlertTriangle, Users, Lock, Phone, Mail,
  ChevronDown, ChevronUp, GripVertical, Shield, Megaphone, Pin, PinOff, CheckCircle2,
  MessageSquareWarning, Lightbulb, Bug,
} from 'lucide-react'
import type { Announcement, AppFeedback } from '@/types'
import {
  DndContext, DragEndEvent, PointerSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/EmptyState'

// ─── Policies types & constants ────────────────────────────────────────────────
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
const TRADE_COLOURS: Record<string, string> = {
  refrigeration: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  hvac:          'bg-orange-50 text-orange-700 border-orange-200',
  general:       '',
}
const STORE_COLOURS: Record<string, string> = {
  Sobeys:  'bg-green-50 text-green-700 border-green-200',
  Loblaws: 'bg-red-50 text-red-700 border-red-200',
  Metro:   'bg-blue-50 text-blue-700 border-blue-200',
  CK:      'bg-purple-50 text-purple-700 border-purple-200',
}

interface Policy {
  id: string; title: string; description: string
  category: string; store: string; trade: string
  url: string; sort_order: number; is_published: boolean; created_at: string
}

// ─── Contacts types & constants ────────────────────────────────────────────────
interface DirectoryContact {
  id: string; section_id: string; name: string; title: string | null
  phone: string | null; email: string | null; notes: string | null; sort_order: number
}
interface ContactSection {
  id: string; title: string; description: string | null
  min_role: 'apprentice' | 'journeyman' | 'manager'; sort_order: number
  directory_contacts: DirectoryContact[]
}
const ROLE_OPTIONS = [
  { value: 'apprentice', label: 'Everyone',      desc: 'Apprentices, Journeymen, Managers' },
  { value: 'journeyman', label: 'Journeyman+',   desc: 'Journeymen and Managers only' },
  { value: 'manager',    label: 'Managers only', desc: 'Managers only' },
]
const ROLE_BADGE: Record<string, string> = {
  apprentice: 'bg-slate-100 text-slate-500 border-slate-200',
  journeyman: 'bg-blue-50 text-blue-600 border-blue-200',
  manager:    'bg-amber-50 text-amber-600 border-amber-200',
}
const ROLE_LABEL: Record<string, string> = {
  apprentice: 'Everyone',
  journeyman: 'Journeyman+',
  manager:    'Managers only',
}

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500'
const lbl = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'

// ─── Policy modal ──────────────────────────────────────────────────────────────
function PolicyModal({ initial, onSave, onClose }: {
  initial?: Policy | null; onSave: (p: Policy) => void; onClose: () => void
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{initial ? 'Edit Policy' : 'Add Policy / Document'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>}
          <div>
            <label className={lbl}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Sobeys Refrigeration Lockout Procedure" />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inp} placeholder="Brief description…" />
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
            <input value={url} onChange={e => setUrl(e.target.value)} className={inp} placeholder="https://…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 rounded-lg">Cancel</button>
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

// ─── Announcement modal ─────────────────────────────────────────────────────────
function AnnouncementModal({ initial, onSave, onClose }: {
  initial?: Announcement | null; onSave: (a: Announcement) => void; onClose: () => void
}) {
  const [title,       setTitle]       = useState(initial?.title        ?? '')
  const [content,     setContent]     = useState(initial?.content      ?? '')
  const [pinned,      setPinned]      = useState(initial?.pinned       ?? false)
  const [requiresAck, setRequiresAck] = useState(initial?.requires_ack ?? false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    if (!title.trim() || !content.trim()) { setError('Title and message are required'); return }
    setSaving(true); setError('')
    const method   = initial ? 'PATCH' : 'POST'
    const endpoint = initial ? `/api/announcements/${initial.id}` : '/api/announcements'
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, pinned, requires_ack: requiresAck }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSave(await res.json())
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{initial ? 'Edit Announcement' : 'New Announcement'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>}
          <div>
            <label className={lbl}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Holiday Schedule Update" />
          </div>
          <div>
            <label className={lbl}>Message *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className={inp} placeholder="Write the announcement…" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" />
              Pin to top of dashboard
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={requiresAck} onChange={e => setRequiresAck(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" />
              Require everyone to acknowledge they&apos;ve read it
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : initial ? 'Update' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section modal ─────────────────────────────────────────────────────────────
function SectionModal({ initial, onSave, onClose }: {
  initial?: ContactSection | null; onSave: (s: ContactSection) => void; onClose: () => void
}) {
  const [title,   setTitle]   = useState(initial?.title       ?? '')
  const [desc,    setDesc]    = useState(initial?.description ?? '')
  const [minRole, setMinRole] = useState(initial?.min_role    ?? 'apprentice')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const method = initial ? 'PATCH' : 'POST'
    const url    = initial ? `/api/contacts/sections/${initial.id}` : '/api/contacts/sections'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, min_role: minRole }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSave(await res.json())
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{initial ? 'Edit Section' : 'Add Section'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>}
          <div>
            <label className={lbl}>Section title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Equipment Emergencies" />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className={inp} placeholder="Optional — shown under the section heading" />
          </div>
          <div>
            <label className={lbl}>Who can see this section?</label>
            <div className="space-y-2 mt-1">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${minRole === opt.value ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <input type="radio" name="min_role" value={opt.value} checked={minRole === opt.value} onChange={() => setMinRole(opt.value as ContactSection['min_role'])} className="mt-0.5 accent-blue-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : initial ? 'Update' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contact modal ─────────────────────────────────────────────────────────────
function ContactModal({ sectionId, initial, onSave, onClose }: {
  sectionId: string; initial?: DirectoryContact | null
  onSave: (c: DirectoryContact) => void; onClose: () => void
}) {
  const [name,   setName]   = useState(initial?.name  ?? '')
  const [title,  setTitle]  = useState(initial?.title ?? '')
  const [phone,  setPhone]  = useState(initial?.phone ?? '')
  const [email,  setEmail]  = useState(initial?.email ?? '')
  const [notes,  setNotes]  = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const method = initial ? 'PATCH' : 'POST'
    const url    = initial ? `/api/contacts/entries/${initial.id}` : '/api/contacts/entries'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: sectionId, name, title, phone, email, notes }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
    onSave(await res.json())
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{initial ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="First Last" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Job title / role</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inp} placeholder="e.g. Service Manager" />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="416-555-0100" type="tel" />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="name@company.com" type="email" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="e.g. Call after 8 am only" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Saving…' : initial ? 'Update' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sortable section card ─────────────────────────────────────────────────────
function SortableSection({
  section, editMode, isManager, collapsed, deletingId,
  onToggleCollapse, onEditSection, onDeleteSection,
  onAddContact, onEditContact, onDeleteContact,
}: {
  section: ContactSection; editMode: boolean; isManager: boolean
  collapsed: boolean; deletingId: string | null
  onToggleCollapse: (id: string) => void; onEditSection: (s: ContactSection) => void
  onDeleteSection: (id: string) => void; onAddContact: (sectionId: string) => void
  onEditContact: (c: DirectoryContact) => void; onDeleteContact: (sectionId: string, contactId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition-shadow ${isDragging ? 'shadow-xl opacity-80 z-50' : ''}`}>
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
        {editMode && (
          <button {...attributes} {...listeners}
            className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded touch-none"
            title="Drag to reorder" tabIndex={-1}>
            <GripVertical size={15}/>
          </button>
        )}
        <button onClick={() => onToggleCollapse(section.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{section.title}</span>
          {section.description && <span className="text-xs text-slate-400 truncate hidden sm:inline">{section.description}</span>}
          {collapsed ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/> : <ChevronUp size={14} className="text-slate-400 flex-shrink-0"/>}
        </button>
        {isManager && (
          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_BADGE[section.min_role]}`}>
            <Lock size={9}/>{ROLE_LABEL[section.min_role]}
          </span>
        )}
        {editMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onAddContact(section.id)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors">
              <Plus size={11}/> Contact
            </button>
            <button onClick={() => onEditSection(section)}
              className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Pencil size={13}/>
            </button>
            <button onClick={() => onDeleteSection(section.id)} disabled={deletingId === section.id}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-40">
              {deletingId === section.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
            </button>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="p-3">
          {section.directory_contacts.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
              No contacts in this section yet.{editMode && ' Click "+ Contact" above to add one.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.directory_contacts.map(contact => (
                <div key={contact.id} className="relative group flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                    {contact.title && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.title}</p>}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                          <Phone size={10}/> {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700">
                          <Mail size={10}/> {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.notes && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">{contact.notes}</p>}
                  </div>
                  {editMode && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => onEditContact(contact)}
                        className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                        <Pencil size={12}/>
                      </button>
                      <button onClick={() => onDeleteContact(section.id, contact.id)} disabled={deletingId === contact.id}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors disabled:opacity-40">
                        {deletingId === contact.id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function CompanyHubPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'announcements' | 'policies' | 'contacts' | 'feedback'>('policies')
  const [isAdmin,   setIsAdmin]   = useState(false)
  const [isManager, setIsManager] = useState(false)

  // Read ?tab= URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'contacts' || tab === 'announcements' || tab === 'feedback') setActiveTab(tab)
  }, [])

  // Auth
  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (profile as { role?: string } | null)?.role ?? ''
      setIsAdmin(['admin', 'manager', 'journeyman'].includes(role))
      setIsManager(['admin', 'manager'].includes(role))
    }
    checkAuth()
  }, [router])

  // ── Announcements state ───────────────────────────────────────────────────────
  const [announcements,      setAnnouncements]      = useState<Announcement[]>([])
  const [annLoading,         setAnnLoading]         = useState(true)
  const [annError,           setAnnError]           = useState<string | null>(null)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [editingAnnouncement,   setEditingAnnouncement]   = useState<Announcement | null>(null)
  const [deletingAnnId,      setDeletingAnnId]      = useState<string | null>(null)

  const loadAnnouncements = useCallback(async () => {
    setAnnLoading(true); setAnnError(null)
    try {
      const res = await fetch('/api/announcements')
      if (!res.ok) throw new Error('Failed')
      setAnnouncements(await res.json())
    } catch {
      setAnnError('Could not load announcements. Check your connection and try again.')
    }
    setAnnLoading(false)
  }, [])

  useEffect(() => { loadAnnouncements() }, [loadAnnouncements])

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return
    setDeletingAnnId(id)
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setDeletingAnnId(null)
  }

  function handleAnnouncementSaved(saved: Announcement) {
    if (editingAnnouncement) {
      setAnnouncements(prev => prev.map(a => a.id === saved.id ? saved : a))
    } else {
      setAnnouncements(prev => [saved, ...prev])
    }
    setShowAnnouncementModal(false)
    setEditingAnnouncement(null)
  }

  function formatAnnDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const [expandedAckId, setExpandedAckId] = useState<string | null>(null)

  async function togglePin(a: Announcement) {
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !a.pinned }),
    })
    if (!res.ok) return
    const saved = await res.json()
    setAnnouncements(prev => {
      const updated = prev.map(x => x.id === saved.id ? saved : x)
      return [...updated].sort((x, y) => {
        if (x.pinned !== y.pinned) return x.pinned ? -1 : 1
        return new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      })
    })
  }

  // ── Feedback state (admin/manager only) ───────────────────────────────────────
  const [feedbackItems,  setFeedbackItems]  = useState<AppFeedback[]>([])
  const [fbLoading,      setFbLoading]      = useState(true)
  const [fbError,        setFbError]        = useState<string | null>(null)
  const [fbFilter,       setFbFilter]       = useState<'all' | 'open' | 'reviewed'>('open')

  const loadFeedback = useCallback(async () => {
    setFbLoading(true); setFbError(null)
    try {
      const res = await fetch('/api/app-feedback')
      if (!res.ok) throw new Error('Failed')
      setFeedbackItems(await res.json())
    } catch {
      setFbError('Could not load feedback. Check your connection and try again.')
    }
    setFbLoading(false)
  }, [])

  useEffect(() => { if (isManager) loadFeedback() }, [isManager, loadFeedback])

  async function setFeedbackStatus(id: string, status: 'open' | 'reviewed') {
    const res = await fetch(`/api/app-feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    const saved = await res.json()
    setFeedbackItems(prev => prev.map(f => f.id === saved.id ? saved : f))
  }

  const visibleFeedback = feedbackItems.filter(f => fbFilter === 'all' || f.status === fbFilter)

  // ── Policies state ────────────────────────────────────────────────────────────
  const [policies,      setPolicies]      = useState<Policy[]>([])
  const [polLoading,    setPolLoading]    = useState(true)
  const [polError,      setPolError]      = useState<string | null>(null)
  const [policyTab,     setPolicyTab]     = useState('company_policy')
  const [storeFilter,   setStoreFilter]   = useState('')
  const [tradeFilter,   setTradeFilter]   = useState('')
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [deletingPolId, setDeletingPolId] = useState<string | null>(null)

  const loadPolicies = useCallback(async () => {
    setPolLoading(true); setPolError(null)
    try {
      const res = await fetch('/api/policies')
      if (!res.ok) throw new Error('Failed')
      setPolicies(await res.json())
    } catch {
      setPolError('Could not load policies. Check your connection and try again.')
    }
    setPolLoading(false)
  }, [])

  useEffect(() => { loadPolicies() }, [loadPolicies])

  async function deletePolicy(id: string) {
    if (!confirm('Delete this policy?')) return
    setDeletingPolId(id)
    await fetch(`/api/policies/${id}`, { method: 'DELETE' })
    setPolicies(prev => prev.filter(p => p.id !== id))
    setDeletingPolId(null)
  }

  function handlePolicySaved(saved: Policy) {
    if (editingPolicy) {
      setPolicies(prev => prev.map(p => p.id === saved.id ? saved : p))
    } else {
      setPolicies(prev => [...prev, saved])
    }
    setShowPolicyModal(false)
    setEditingPolicy(null)
  }

  const tabPolicies = policies.filter(p => {
    if (p.category !== policyTab) return false
    if (storeFilter && p.store !== storeFilter && p.store !== '') return false
    if (tradeFilter && p.trade !== tradeFilter) return false
    return true
  })
  const activeCat = CATEGORIES.find(c => c.key === policyTab)!

  // ── Contacts state ────────────────────────────────────────────────────────────
  const [sections,        setSections]        = useState<ContactSection[]>([])
  const [conLoading,      setConLoading]      = useState(true)
  const [conError,        setConError]        = useState<string | null>(null)
  const [editMode,        setEditMode]        = useState(false)
  const [collapsedIds,    setCollapsedIds]    = useState<Set<string>>(new Set())
  const [sectionModal,    setSectionModal]    = useState(false)
  const [editingSection,  setEditingSection]  = useState<ContactSection | null>(null)
  const [contactModal,    setContactModal]    = useState(false)
  const [editingContact,  setEditingContact]  = useState<DirectoryContact | null>(null)
  const [targetSectionId, setTargetSectionId] = useState<string>('')
  const [deletingConId,   setDeletingConId]   = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadSections = useCallback(async () => {
    setConLoading(true); setConError(null)
    try {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error('Failed')
      setSections(await res.json())
    } catch {
      setConError('Could not load contacts. Check your connection and try again.')
    }
    setConLoading(false)
  }, [])

  useEffect(() => { loadSections() }, [loadSections])

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSections(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id)
      const newIdx = prev.findIndex(s => s.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, sort_order: i }))
      reordered.forEach((s, i) => {
        if (prev[prev.findIndex(p => p.id === s.id)].sort_order !== i) {
          fetch(`/api/contacts/sections/${s.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: i }),
          })
        }
      })
      return reordered
    })
  }

  function handleSectionSaved(saved: ContactSection) {
    if (editingSection) {
      setSections(prev => prev.map(s => s.id === saved.id ? { ...saved, directory_contacts: s.directory_contacts } : s))
    } else {
      setSections(prev => [...prev, { ...saved, directory_contacts: [] }])
    }
    setSectionModal(false)
    setEditingSection(null)
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section and all its contacts?')) return
    setDeletingConId(id)
    await fetch(`/api/contacts/sections/${id}`, { method: 'DELETE' })
    setSections(prev => prev.filter(s => s.id !== id))
    setDeletingConId(null)
  }

  function handleContactSaved(saved: DirectoryContact) {
    setSections(prev => prev.map(s => {
      if (s.id !== saved.section_id) return s
      const exists = s.directory_contacts.some(c => c.id === saved.id)
      return { ...s, directory_contacts: exists ? s.directory_contacts.map(c => c.id === saved.id ? saved : c) : [...s.directory_contacts, saved] }
    }))
    setContactModal(false)
    setEditingContact(null)
  }

  async function deleteContact(sectionId: string, contactId: string) {
    if (!confirm('Remove this contact?')) return
    setDeletingConId(contactId)
    await fetch(`/api/contacts/entries/${contactId}`, { method: 'DELETE' })
    setSections(prev => prev.map(s => s.id !== sectionId ? s : { ...s, directory_contacts: s.directory_contacts.filter(c => c.id !== contactId) }))
    setDeletingConId(null)
  }

  function openAddContact(sectionId: string) { setTargetSectionId(sectionId); setEditingContact(null); setContactModal(true) }
  function openEditContact(contact: DirectoryContact) { setTargetSectionId(contact.section_id); setEditingContact(contact); setContactModal(true) }

  return (
    <PageShell>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Modals */}
      {(showAnnouncementModal || editingAnnouncement) && (
        <AnnouncementModal initial={editingAnnouncement} onSave={handleAnnouncementSaved}
          onClose={() => { setShowAnnouncementModal(false); setEditingAnnouncement(null) }} />
      )}
      {(showPolicyModal || editingPolicy) && (
        <PolicyModal initial={editingPolicy} onSave={handlePolicySaved}
          onClose={() => { setShowPolicyModal(false); setEditingPolicy(null) }} />
      )}
      {(sectionModal || editingSection) && (
        <SectionModal initial={editingSection} onSave={handleSectionSaved}
          onClose={() => { setSectionModal(false); setEditingSection(null) }} />
      )}
      {contactModal && (
        <ContactModal sectionId={targetSectionId} initial={editingContact} onSave={handleContactSaved}
          onClose={() => { setContactModal(false); setEditingContact(null) }} />
      )}

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <Home size={18}/>
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">IQ</span>
        </div>
        <span className="text-slate-400 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Hub</span>

        {/* Contextual add button */}
        {activeTab === 'announcements' && isManager && (
          <button onClick={() => { setEditingAnnouncement(null); setShowAnnouncementModal(true) }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg">
            <Plus size={13}/> New Announcement
          </button>
        )}
        {activeTab === 'policies' && isAdmin && (
          <button onClick={() => { setEditingPolicy(null); setShowPolicyModal(true) }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg">
            <Plus size={13}/> Add
          </button>
        )}
        {activeTab === 'contacts' && isManager && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setEditMode(e => !e)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${editMode ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {editMode ? 'Done editing' : 'Edit'}
            </button>
            {editMode && (
              <button onClick={() => { setEditingSection(null); setSectionModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg">
                <Plus size={13}/> Add Section
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab selector */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 flex items-center gap-0.5">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'announcements'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone size={12}/> Announcements
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'policies'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield size={12}/> Policies &amp; Procedures
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'contacts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users size={12}/> Contact Directory
        </button>
        {isManager && (
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'feedback'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquareWarning size={12}/> Feedback
            {feedbackItems.some(f => f.status === 'open') && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        )}
      </div>

      {/* ── Announcements tab ── */}
      {activeTab === 'announcements' && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-3">
          {annError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={15} className="flex-shrink-0"/>
              <span className="flex-1">{annError}</span>
              <button onClick={loadAnnouncements} className="font-medium underline hover:no-underline">Retry</button>
            </div>
          )}

          {annLoading && (
            <div className="flex justify-center py-12 text-slate-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin"/> Loading…
            </div>
          )}

          {!annLoading && !annError && announcements.length === 0 && (
            <EmptyState
              icon={Megaphone}
              title="No announcements yet."
              description={isManager ? 'Click "New Announcement" in the header to post the first one.' : undefined}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-14"
            />
          )}

          {!annLoading && announcements.length > 0 && (
            <div className="space-y-2">
              {announcements.map(a => {
                const ackCount = a.acknowledgements?.length ?? 0
                const ackExpanded = expandedAckId === a.id
                return (
                <div key={a.id} className={`bg-white dark:bg-slate-900 border rounded-xl px-4 py-3.5 ${a.pinned ? 'border-blue-300 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {a.pinned ? <Pin size={16} className="text-blue-600 dark:text-blue-400"/> : <Megaphone size={16} className="text-blue-600 dark:text-blue-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
                        {a.pinned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">Pinned</span>
                        )}
                        {a.requires_ack && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">Acknowledgement required</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                        {a.users?.name ? `${a.users.name} · ` : ''}{formatAnnDate(a.created_at)}
                      </p>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => togglePin(a)} title={a.pinned ? 'Unpin' : 'Pin to top of dashboard'}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors">
                          {a.pinned ? <PinOff size={13}/> : <Pin size={13}/>}
                        </button>
                        <button onClick={() => { setEditingAnnouncement(a); setShowAnnouncementModal(true) }}
                          className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} disabled={deletingAnnId === a.id}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                          {deletingAnnId === a.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                        </button>
                      </div>
                    )}
                  </div>

                  {isManager && a.requires_ack && (
                    <div className="mt-2.5 ml-12">
                      <button onClick={() => setExpandedAckId(ackExpanded ? null : a.id)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                        <CheckCircle2 size={12}/>
                        Acknowledged by {ackCount}{a.total_active_users ? ` of ${a.total_active_users}` : ''}
                        {ackExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      </button>
                      {ackExpanded && (
                        <div className="mt-1.5 space-y-1">
                          {ackCount === 0 && <p className="text-[11px] text-slate-400 dark:text-slate-500">No one has acknowledged yet.</p>}
                          {a.acknowledgements?.map(ack => (
                            <p key={ack.user_id} className="text-[11px] text-slate-500 dark:text-slate-400">
                              {ack.users?.name ?? 'Unknown user'} · {formatAnnDate(ack.acknowledged_at)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {/* ── Policies tab ── */}
      {activeTab === 'policies' && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">
          {/* Category tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.map(cat => {
              const count  = policies.filter(p => p.category === cat.key).length
              const active = policyTab === cat.key
              return (
                <button key={cat.key} onClick={() => { setPolicyTab(cat.key); setStoreFilter(''); setTradeFilter('') }}
                  className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg">{cat.icon}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{count}</span>
                  </div>
                  <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{cat.label}</p>
                </button>
              )
            })}
          </div>

          {/* Store/trade sub-filters */}
          {policyTab === 'store_procedure' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setStoreFilter('')}
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${!storeFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                  All Stores
                </button>
                {STORES.map(s => (
                  <button key={s} onClick={() => setStoreFilter(storeFilter === s ? '' : s)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${storeFilter === s ? `${STORE_COLOURS[s]} border` : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRADES.map(t => (
                  <button key={t.key} onClick={() => setTradeFilter(tradeFilter === t.key ? '' : t.key)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${tradeFilter === t.key ? 'bg-slate-600 text-white border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {polError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={15} className="flex-shrink-0"/>
              <span className="flex-1">{polError}</span>
              <button onClick={loadPolicies} className="font-medium underline hover:no-underline">Retry</button>
            </div>
          )}

          {polLoading && (
            <div className="flex justify-center py-12 text-slate-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin"/> Loading…
            </div>
          )}

          {!polLoading && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">{activeCat.icon}</span>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">{activeCat.label}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activeCat.desc}</p>
              </div>
            </div>
          )}

          {!polLoading && !polError && tabPolicies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <span className="text-4xl mb-3">{activeCat.icon}</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">No documents in this section yet.</p>
              {isAdmin && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click &ldquo;+ Add&rdquo; in the header to add the first one.</p>}
            </div>
          )}

          {!polLoading && tabPolicies.length > 0 && (
            <div className="space-y-2">
              {tabPolicies.map(policy => (
                <div key={policy.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={16} className="text-slate-500 dark:text-slate-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{policy.title}</p>
                      {policy.store && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STORE_COLOURS[policy.store] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{policy.store}</span>
                      )}
                      {policy.trade !== 'general' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TRADE_COLOURS[policy.trade] ?? ''}`}>
                          {TRADES.find(t => t.key === policy.trade)?.label}
                        </span>
                      )}
                    </div>
                    {policy.description && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{policy.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {policy.url && (
                      <a href={policy.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Open document">
                        <ExternalLink size={15}/>
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => { setEditingPolicy(policy); setShowPolicyModal(true) }}
                          className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => deletePolicy(policy.id)} disabled={deletingPolId === policy.id}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                          {deletingPolId === policy.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Contacts tab ── */}
      {activeTab === 'contacts' && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
          {conError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <span className="flex-1">{conError}</span>
              <button onClick={loadSections} className="font-medium underline hover:no-underline">Retry</button>
            </div>
          )}

          {conLoading && (
            <div className="flex justify-center py-16 text-slate-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin"/> Loading…
            </div>
          )}

          {!conLoading && !conError && sections.length === 0 && (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              description={isManager ? 'Click "Edit" then "+ Add Section" to get started.' : undefined}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl"
            />
          )}

          {!conLoading && sections.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {sections.map(section => (
                    <SortableSection
                      key={section.id} section={section}
                      editMode={editMode} isManager={isManager}
                      collapsed={collapsedIds.has(section.id)}
                      deletingId={deletingConId}
                      onToggleCollapse={toggleCollapse}
                      onEditSection={s => { setEditingSection(s); setSectionModal(true) }}
                      onDeleteSection={deleteSection}
                      onAddContact={openAddContact}
                      onEditContact={openEditContact}
                      onDeleteContact={deleteContact}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* ── Feedback tab (admin/manager only) ── */}
      {activeTab === 'feedback' && isManager && (
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['open', 'reviewed', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFbFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${fbFilter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                {f}
              </button>
            ))}
          </div>

          {fbError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={15} className="flex-shrink-0"/>
              <span className="flex-1">{fbError}</span>
              <button onClick={loadFeedback} className="font-medium underline hover:no-underline">Retry</button>
            </div>
          )}

          {fbLoading && (
            <div className="flex justify-center py-12 text-slate-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin"/> Loading…
            </div>
          )}

          {!fbLoading && !fbError && visibleFeedback.length === 0 && (
            <EmptyState
              icon={MessageSquareWarning}
              title={`No ${fbFilter !== 'all' ? fbFilter : ''} feedback.`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-14"
            />
          )}

          {!fbLoading && visibleFeedback.length > 0 && (
            <div className="space-y-2">
              {visibleFeedback.map(f => (
                <div key={f.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${f.type === 'bug' ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'}`}>
                    {f.type === 'bug' ? <Bug size={16} className="text-red-600 dark:text-red-400"/> : <Lightbulb size={16} className="text-blue-600 dark:text-blue-400"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${f.type === 'bug' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'}`}>
                        {f.type}
                      </span>
                      {f.status === 'reviewed' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">Reviewed</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{f.message}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                      {f.users?.name ?? 'Unknown user'} · {formatAnnDate(f.created_at)}
                    </p>
                  </div>
                  <button onClick={() => setFeedbackStatus(f.id, f.status === 'open' ? 'reviewed' : 'open')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 flex-shrink-0">
                    {f.status === 'open' ? <CheckCircle2 size={12}/> : <ChevronUp size={12}/>}
                    {f.status === 'open' ? 'Mark reviewed' : 'Mark open'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </PageShell>
  )
}
