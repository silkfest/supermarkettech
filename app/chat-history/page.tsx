'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Wrench, Clock, Star, Loader2, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface SessionMessage { id: string; role: string; content: string; created_at: string }
interface Session {
  id: string
  title: string
  mode: string
  created_at: string
  equipment_id: string | null
  equipment: { name: string; manufacturer: string; model: string } | null
  messages: SessionMessage[]
  tip: { id: string; title: string } | null
}

const MODE_LABEL: Record<string, string> = { EXPERT: 'Expert', MAINTENANCE: 'Maintenance' }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: (id: string) => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [savingTip, setSavingTip] = useState(false)
  const [tipSaved, setTipSaved]   = useState(!!session.tip)
  const [tipTitle, setTipTitle]   = useState(session.title)
  const [showInput, setShowInput] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const messages = session.messages ?? []
  const userMsgCount = messages.filter(m => m.role === 'user').length

  async function handleSaveAsTip() {
    if (!tipTitle.trim()) return
    setSavingTip(true)
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title: tipTitle.trim() }),
      })
      if (res.ok || res.status === 409) setTipSaved(true)
    } finally {
      setSavingTip(false)
      setShowInput(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(session.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageSquare size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{session.title || 'Untitled session'}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {session.equipment && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Wrench size={10} />
                {session.equipment.name} · {session.equipment.manufacturer} {session.equipment.model}
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${session.mode === 'EXPERT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
              {MODE_LABEL[session.mode] ?? session.mode}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(session.created_at)}
            </span>
            <span className="text-[11px] text-slate-400">{userMsgCount} message{userMsgCount !== 1 ? 's' : ''}</span>
            {tipSaved && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Star size={9} className="fill-amber-500 text-amber-500" /> Saved as tip
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!tipSaved && !showInput && messages.length >= 2 && (
            <button
              onClick={() => setShowInput(true)}
              className="text-[11px] text-slate-400 hover:text-amber-600 transition-colors px-2 py-1 rounded-lg hover:bg-amber-50"
            >
              Save as tip
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete conversation"
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Save as tip input */}
      {showInput && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <input
            autoFocus
            value={tipTitle}
            onChange={e => setTipTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveAsTip(); if (e.key === 'Escape') setShowInput(false) }}
            placeholder="Give this tip a title…"
            className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSaveAsTip}
            disabled={savingTip || !tipTitle.trim()}
            className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
          >
            {savingTip ? <Loader2 size={11} className="animate-spin" /> : null}
            Save
          </button>
          <button onClick={() => setShowInput(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">Cancel</button>
        </div>
      )}

      {/* Expanded conversation */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No messages in this session.</p>
          ) : (
            messages
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={[
                    'max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm',
                  ].join(' ')}>
                    {msg.role === 'user' ? (
                      <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <code className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ChatHistoryPage() {
  const router = useRouter()
  const [sessions, setSessions]         = useState<Session[]>([])
  const [loading, setLoading]           = useState(true)
  const [clearingAll, setClearingAll]   = useState(false)
  const [search, setSearch]             = useState('')
  const [filterMode, setFilterMode]     = useState<'all' | 'EXPERT' | 'MAINTENANCE'>('all')

  useEffect(() => {
    void (async () => {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/chat/sessions')
      if (res.ok) setSessions(await res.json())
      setLoading(false)
    })()
  }, [router])

  function handleDeleted(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  async function handleClearAll() {
    if (!confirm(`Delete all ${sessions.length} conversation${sessions.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setClearingAll(true)
    try {
      const res = await fetch('/api/chat/sessions', { method: 'DELETE' })
      if (res.ok) setSessions([])
    } finally {
      setClearingAll(false)
    }
  }

  const filtered = sessions.filter(s => {
    const matchesSearch =
      (s.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.equipment?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesMode = filterMode === 'all' || s.mode === filterMode
    return matchesSearch && matchesMode
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600" title="Dashboard">
          <Home size={18} />
        </button>
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-700">Chat History</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" />
              Chat History
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">All team conversations — expand to view, save as a tip, or delete</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36"
            />
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
              {(['all', 'EXPERT', 'MAINTENANCE'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={`px-2.5 py-1.5 font-medium transition-colors ${filterMode === m ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {m === 'all' ? 'All' : m === 'EXPERT' ? 'Expert' : 'Maint.'}
                </button>
              ))}
            </div>
            {sessions.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {clearingAll ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Clear all
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16 text-slate-400 text-sm">Loading history…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={32} className="text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">
              {search || filterMode !== 'all' ? 'No sessions match your filters.' : 'No chat sessions yet. Start a conversation on the dashboard.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(session => (
            <SessionCard key={session.id} session={session} onDelete={handleDeleted} />
          ))}
        </div>
      </div>
    </div>
  )
}
