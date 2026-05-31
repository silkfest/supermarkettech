'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, Plus, Pencil, Trash2,
  Loader2, X, Users, Lock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import PageShell from '@/components/layout/PageShell'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DirectoryContact {
  id: string
  section_id: string
  name: string
  title: string | null
  phone: string | null
  email: string | null
  notes: string | null
  sort_order: number
}

interface ContactSection {
  id: string
  title: string
  description: string | null
  min_role: 'apprentice' | 'journeyman' | 'manager'
  sort_order: number
  directory_contacts: DirectoryContact[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'apprentice', label: 'Everyone',   desc: 'Apprentices, Journeymen, Managers' },
  { value: 'journeyman', label: 'Journeyman+', desc: 'Journeymen and Managers only' },
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

// ─── Section modal ─────────────────────────────────────────────────────────────
function SectionModal({ initial, onSave, onClose }: {
  initial?: ContactSection | null
  onSave: (s: ContactSection) => void
  onClose: () => void
}) {
  const [title,    setTitle]    = useState(initial?.title       ?? '')
  const [desc,     setDesc]     = useState(initial?.description ?? '')
  const [minRole,  setMinRole]  = useState(initial?.min_role    ?? 'apprentice')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    const method   = initial ? 'PATCH' : 'POST'
    const url      = initial ? `/api/contacts/sections/${initial.id}` : '/api/contacts/sections'
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
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {initial ? 'Edit Section' : 'Add Section'}
          </h2>
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg">Cancel</button>
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
  sectionId: string
  initial?: DirectoryContact | null
  onSave: (c: DirectoryContact) => void
  onClose: () => void
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
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {initial ? 'Edit Contact' : 'Add Contact'}
          </h2>
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg">Cancel</button>
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

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const router = useRouter()

  const [sections,        setSections]        = useState<ContactSection[]>([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [isManager,       setIsManager]       = useState(false)
  const [editMode,        setEditMode]        = useState(false)
  const [collapsedIds,    setCollapsedIds]    = useState<Set<string>>(new Set())

  const [sectionModal,    setSectionModal]    = useState(false)
  const [editingSection,  setEditingSection]  = useState<ContactSection | null>(null)
  const [contactModal,    setContactModal]    = useState(false)
  const [editingContact,  setEditingContact]  = useState<DirectoryContact | null>(null)
  const [targetSectionId, setTargetSectionId] = useState<string>('')
  const [deletingId,      setDeletingId]      = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (profile as { role?: string } | null)?.role ?? ''
      setIsManager(['admin', 'manager'].includes(role))
    }
    checkAuth()
  }, [router])

  const loadSections = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error('Failed')
      setSections(await res.json())
    } catch {
      setError('Could not load contacts. Check your connection and try again.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadSections() }, [loadSections])

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Section saved (add or edit) ──────────────────────────────────────────────
  function handleSectionSaved(saved: ContactSection) {
    if (editingSection) {
      setSections(prev => prev.map(s => s.id === saved.id
        ? { ...saved, directory_contacts: s.directory_contacts }
        : s))
    } else {
      setSections(prev => [...prev, { ...saved, directory_contacts: [] }])
    }
    setSectionModal(false)
    setEditingSection(null)
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section and all its contacts?')) return
    setDeletingId(id)
    await fetch(`/api/contacts/sections/${id}`, { method: 'DELETE' })
    setSections(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  // ── Contact saved (add or edit) ──────────────────────────────────────────────
  function handleContactSaved(saved: DirectoryContact) {
    setSections(prev => prev.map(s => {
      if (s.id !== saved.section_id) return s
      const exists = s.directory_contacts.some(c => c.id === saved.id)
      return {
        ...s,
        directory_contacts: exists
          ? s.directory_contacts.map(c => c.id === saved.id ? saved : c)
          : [...s.directory_contacts, saved],
      }
    }))
    setContactModal(false)
    setEditingContact(null)
  }

  async function deleteContact(sectionId: string, contactId: string) {
    if (!confirm('Remove this contact?')) return
    setDeletingId(contactId)
    await fetch(`/api/contacts/entries/${contactId}`, { method: 'DELETE' })
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, directory_contacts: s.directory_contacts.filter(c => c.id !== contactId) }
    ))
    setDeletingId(null)
  }

  function openAddContact(sectionId: string) {
    setTargetSectionId(sectionId)
    setEditingContact(null)
    setContactModal(true)
  }

  function openEditContact(contact: DirectoryContact) {
    setTargetSectionId(contact.section_id)
    setEditingContact(contact)
    setContactModal(true)
  }

  return (
    <PageShell>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Modals */}
      {(sectionModal || editingSection) && (
        <SectionModal
          initial={editingSection}
          onSave={handleSectionSaved}
          onClose={() => { setSectionModal(false); setEditingSection(null) }}
        />
      )}
      {contactModal && (
        <ContactModal
          sectionId={targetSectionId}
          initial={editingContact}
          onSave={handleContactSaved}
          onClose={() => { setContactModal(false); setEditingContact(null) }}
        />
      )}

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
          <ArrowLeft size={18}/>
        </button>
        <Users size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0"/>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Contact Directory</span>

        {isManager && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setEditMode(e => !e)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                editMode
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {editMode ? 'Done editing' : 'Edit'}
            </button>
            {editMode && (
              <button
                onClick={() => { setEditingSection(null); setSectionModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
              >
                <Plus size={13}/> Add Section
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <span className="flex-1">{error}</span>
            <button onClick={loadSections} className="font-medium underline hover:no-underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16 text-slate-400 dark:text-slate-500 text-sm gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading…
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <Users size={32} className="text-slate-300 dark:text-slate-600 mb-3"/>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No contacts yet</p>
            {isManager && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Click &ldquo;Edit&rdquo; then &ldquo;+ Add Section&rdquo; to get started.
              </p>
            )}
          </div>
        )}

        {/* Sections */}
        {!loading && sections.map(section => {
          const collapsed = collapsedIds.has(section.id)
          return (
            <div key={section.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">

              {/* Section header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => toggleCollapse(section.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{section.title}</span>
                  {section.description && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">{section.description}</span>
                  )}
                  {collapsed ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/> : <ChevronUp size={14} className="text-slate-400 flex-shrink-0"/>}
                </button>

                {/* Visibility badge — managers only */}
                {isManager && (
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_BADGE[section.min_role]}`}>
                    <Lock size={9}/>
                    {ROLE_LABEL[section.min_role]}
                  </span>
                )}

                {/* Edit-mode actions */}
                {editMode && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openAddContact(section.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                    >
                      <Plus size={11}/> Contact
                    </button>
                    <button
                      onClick={() => { setEditingSection(section); setSectionModal(true) }}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit section"
                    >
                      <Pencil size={13}/>
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      disabled={deletingId === section.id}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete section"
                    >
                      {deletingId === section.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                    </button>
                  </div>
                )}
              </div>

              {/* Contacts grid */}
              {!collapsed && (
                <div className="p-3">
                  {section.directory_contacts.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                      No contacts in this section yet.
                      {editMode && ' Click "+ Contact" above to add one.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {section.directory_contacts.map(contact => (
                        <div key={contact.id} className="relative group flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors bg-slate-50/50 dark:bg-slate-800/30">

                          {/* Avatar initials */}
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400">
                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                            {contact.title && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.title}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {contact.phone && (
                                <a href={`tel:${contact.phone}`}
                                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Phone size={10}/> {contact.phone}
                                </a>
                              )}
                              {contact.email && (
                                <a href={`mailto:${contact.email}`}
                                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Mail size={10}/> {contact.email}
                                </a>
                              )}
                            </div>
                            {contact.notes && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">{contact.notes}</p>
                            )}
                          </div>

                          {/* Edit-mode actions */}
                          {editMode && (
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => openEditContact(contact)}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Edit contact"
                              >
                                <Pencil size={12}/>
                              </button>
                              <button
                                onClick={() => deleteContact(section.id, contact.id)}
                                disabled={deletingId === contact.id}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors disabled:opacity-40"
                                title="Remove contact"
                              >
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
        })}
      </div>
    </div>
    </PageShell>
  )
}
