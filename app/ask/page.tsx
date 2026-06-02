'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, MessageCircle, Clock, Tag, ChevronRight, HelpCircle, Pin, Trash2 } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import LearningTabBar from '@/components/layout/LearningTabBar'
import { getSupabaseBrowser } from '@/lib/supabase/client'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const ROLE_BADGE: Record<string, string> = {
  admin:      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30',
  manager:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  journeyman: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  apprentice: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
}

interface Question {
  id: string
  title: string
  body: string
  tags: string[]
  created_at: string
  is_pinned: boolean
  answer_count: number
  author: { name: string; role: string } | null
}

export default function AskTeamPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
        const role = (profile as { role?: string } | null)?.role ?? ''
        setIsAdmin(role === 'admin' || role === 'manager')
      }
    }
    init()
  }, [])

  function loadQuestions() {
    fetch('/api/ask')
      .then(r => r.ok ? r.json() : [])
      .then(setQuestions)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadQuestions() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        const q = await res.json()
        router.push(`/ask/${q.id}`)
      } else {
        setError('Failed to post question. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteQuestion(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this question and all its answers?')) return
    setDeleting(id)
    try {
      await fetch(`/api/ask/${id}`, { method: 'DELETE' })
      setQuestions(prev => prev.filter(q => q.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function cancelForm() {
    setShowForm(false)
    setTitle('')
    setBody('')
    setTags('')
    setError('')
  }

  return (
    <PageShell>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        {/* Header */}
        <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 md:px-8 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Ask the Team</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Post technical questions — anyone on the team can answer
              </p>
            </div>
            <button
              onClick={() => showForm ? cancelForm() : setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
            >
              {showForm ? <X size={13} /> : <Plus size={13} />}
              {showForm ? 'Cancel' : 'New Question'}
            </button>
          </div>
        </div>

        <LearningTabBar />

        <div className="max-w-3xl mx-auto px-4 py-5 md:px-6">

          {/* New question form */}
          {showForm && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5 mb-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Ask a question</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Why is my subcooling reading unusually high?"
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Describe the situation — what equipment, what symptoms, what you've already checked, any readings..."
                    rows={5}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Tags <span className="text-slate-400 font-normal">(optional, comma-separated)</span>
                  </label>
                  <input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="e.g. refrigeration, txv, subcooling"
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" onClick={cancelForm} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !body.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {submitting ? 'Posting…' : 'Post Question'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions list */}
          {loading ? (
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-16" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No questions yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to ask your team something</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Ask a Question
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {questions.map(q => (
                <div key={q.id} className="relative group/row">
                  <button
                    onClick={() => router.push(`/ask/${q.id}`)}
                    className={`w-full bg-white dark:bg-slate-900 rounded-lg border p-4 text-left transition-all group hover:shadow-sm ${
                      q.is_pinned
                        ? 'border-amber-200 dark:border-amber-500/40 hover:border-amber-300 dark:hover:border-amber-500/60'
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {q.is_pinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                              <Pin size={8} /> Pinned
                            </span>
                          )}
                          {q.answer_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                              <MessageCircle size={9} />
                              {q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                              Unanswered
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-6">
                          {q.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {q.body}
                        </p>
                      </div>
                      <ChevronRight size={14} className="flex-shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 mt-1 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {q.author && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_BADGE[q.author.role] ?? ROLE_BADGE.apprentice}`}>
                          {q.author.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <Clock size={9} />
                        {timeAgo(q.created_at)}
                      </span>
                      {q.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>

                  {/* Admin delete button */}
                  {isAdmin && (
                    <button
                      onClick={e => deleteQuestion(e, q.id)}
                      disabled={deleting === q.id}
                      className="absolute top-3 right-8 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100"
                      title="Delete question"
                    >
                      <Trash2 size={13} />
                    </button>
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
