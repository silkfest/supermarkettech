'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Lightbulb, Trash2, ChevronDown, ChevronUp, User, Wrench } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface TipMessage { role: string; content: string }
interface TipSession {
  id: string; mode: string
  equipment: { name: string; manufacturer: string; model: string } | null
  messages: TipMessage[]
}
interface Tip {
  id: string
  title: string
  tags: string[]
  created_at: string
  saved_by: string | null
  saver: { name: string } | null
  session: TipSession | null
}

const ALL_TAGS = ['Superheat', 'Defrost', 'Leak', 'Compressor', 'Alarms', 'Electrical', 'Controls']

const TAG_COLOURS: Record<string, string> = {
  Superheat:   'bg-orange-50 border-orange-200 text-orange-700',
  Defrost:     'bg-sky-50 border-sky-200 text-sky-700',
  Leak:        'bg-red-50 border-red-200 text-red-700',
  Compressor:  'bg-violet-50 border-violet-200 text-violet-700',
  Alarms:      'bg-yellow-50 border-yellow-200 text-yellow-700',
  Electrical:  'bg-blue-50 border-blue-200 text-blue-700',
  Controls:    'bg-emerald-50 border-emerald-200 text-emerald-700',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function TipCard({ tip, currentUserId, isAdmin, onDelete }: {
  tip: Tip; currentUserId: string; isAdmin: boolean; onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canDelete = tip.saved_by === currentUserId || isAdmin
  const messages = tip.session?.messages ?? []
  const tags = tip.tags ?? []

  async function handleDelete() {
    if (!confirm('Remove this troubleshooting tip?')) return
    setDeleting(true)
    const res = await fetch(`/api/tips/${tip.id}`, { method: 'DELETE' })
    if (res.ok) onDelete(tip.id)
    else setDeleting(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb size={15} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{tip.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {tip.session?.equipment && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Wrench size={10} />
                {tip.session.equipment.name} · {tip.session.equipment.manufacturer} {tip.session.equipment.model}
              </span>
            )}
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User size={10} />
              {tip.saver?.name ?? 'Unknown'}
            </span>
            <span className="text-[11px] text-slate-400">{timeAgo(tip.created_at)}</span>
          </div>
          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map(tag => (
                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TAG_COLOURS[tag] ?? 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Remove tip"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Conversation */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 italic">No messages found for this session.</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={[
                'max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm',
              ].join(' ')}>
                {msg.role === 'user'
                  ? <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                        h2: ({ children }) => <p className="font-semibold text-sm mb-1 mt-2">{children}</p>,
                        h3: ({ children }) => <p className="font-semibold text-sm mb-0.5 mt-1.5">{children}</p>,
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
                  )
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TipsPage() {
  const router = useRouter()
  const [tips, setTips]                   = useState<Tip[]>([])
  const [loading, setLoading]             = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isAdmin, setIsAdmin]             = useState(false)
  const [search, setSearch]               = useState('')
  const [activeTag, setActiveTag]         = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
      const role = (profile as { role: string } | null)?.role ?? ''
      setIsAdmin(role === 'admin' || role === 'manager')

      const res = await fetch('/api/tips')
      if (res.ok) setTips(await res.json())
      setLoading(false)
    })()
  }, [router])

  const filtered = tips.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.session?.equipment?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || (t.tags ?? []).includes(activeTag)
    return matchSearch && matchTag
  })

  // Which tags are actually used in visible tips (before tag filter is applied)
  const usedTags = ALL_TAGS.filter(tag => tips.some(t => (t.tags ?? []).includes(tag)))

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
        <span className="text-sm font-medium text-slate-700">Troubleshooting Tips</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title + search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Lightbulb size={20} className="text-amber-500" />
              Troubleshooting Tips
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Helpful chats saved by your team</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tips…"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
          />
        </div>

        {/* Tag filter row */}
        {usedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                !activeTag
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              All
            </button>
            {usedTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  activeTag === tag
                    ? (TAG_COLOURS[tag] ?? 'bg-slate-100 border-slate-300 text-slate-700') + ' !border-opacity-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16 text-slate-400 text-sm">Loading tips…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Lightbulb size={32} className="text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">
              {search || activeTag
                ? 'No tips match your filters.'
                : 'No tips saved yet. After a useful chat, click "Save as troubleshooting tip".'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(tip => (
            <TipCard
              key={tip.id}
              tip={tip}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={id => setTips(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
