'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MessageSquare, Tag, Clock, Send, CheckCircle2, Pin, PinOff, Trash2 } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import LearningTabBar from '@/components/layout/LearningTabBar'
import { useConfirm } from '@/components/ConfirmDialog'
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

interface Author { name: string; role: string }
interface QuestionDetail {
  id: string; title: string; body: string; tags: string[]
  created_at: string; is_pinned: boolean; author: Author | null
}
interface Answer {
  id: string; body: string; is_accepted: boolean
  created_at: string; author: Author | null
}

export default function AskDetailPage() {
  const router = useRouter()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [question, setQuestion] = useState<QuestionDetail | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [answerBody, setAnswerBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [deletingAnswer, setDeletingAnswer] = useState<string | null>(null)

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

  const load = useCallback(async () => {
    const res = await fetch(`/api/ask/${id}`)
    if (res.ok) {
      const data = await res.json()
      setQuestion(data.question)
      setAnswers(data.answers)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!answerBody.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/ask/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: answerBody.trim() }),
      })
      if (res.ok) {
        setAnswerBody('')
        await load()
      } else {
        setSubmitError('Failed to post. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePin() {
    if (!question) return
    setPinning(true)
    try {
      await fetch(`/api/ask/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !question.is_pinned }),
      })
      setQuestion(q => q ? { ...q, is_pinned: !q.is_pinned } : q)
    } finally {
      setPinning(false)
    }
  }

  async function handleDeleteQuestion() {
    if (!await confirm({ message: 'Delete this question and all its answers?', confirmLabel: 'Delete', danger: true })) return
    setDeletingQuestion(true)
    try {
      await fetch(`/api/ask/${id}`, { method: 'DELETE' })
      router.push('/ask')
    } finally {
      setDeletingQuestion(false)
    }
  }

  async function handleDeleteAnswer(answerId: string) {
    if (!await confirm({ message: 'Delete this answer?', confirmLabel: 'Delete', danger: true })) return
    setDeletingAnswer(answerId)
    try {
      await fetch(`/api/ask/${id}/answers/${answerId}`, { method: 'DELETE' })
      setAnswers(prev => prev.filter(a => a.id !== answerId))
    } finally {
      setDeletingAnswer(null)
    }
  }

  if (!loading && !question) {
    return (
      <PageShell>
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Question not found</p>
            <button
              onClick={() => router.push('/ask')}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Back to Ask the Team
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        {confirmDialog}
        {/* Header */}
        <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 md:px-8 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button
              onClick={() => router.push('/ask')}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={13} />
              Ask the Team
            </button>
            {question && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-xs">/</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                  {question.title}
                </span>
                <button
                  onClick={() => {
                    const prefill = `I was looking at a team question: "${question.title}"\n\nDetails: ${question.body}\n\nMy follow-up question: `
                    router.push(`/dashboard?q=${encodeURIComponent(prefill)}`)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  title="Ask ColdIQ about this"
                >
                  <MessageSquare size={11} /> Ask ColdIQ
                </button>
              </>
            )}
          </div>
        </div>

        <LearningTabBar />

        <div className="max-w-3xl mx-auto px-4 py-5 md:px-6">
          {loading ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                </div>
              </div>
            </div>
          ) : question && (
            <>
              {/* Question card */}
              <div className={`bg-white dark:bg-slate-900 rounded-lg border p-5 md:p-6 mb-5 ${
                question.is_pinned
                  ? 'border-amber-200 dark:border-amber-500/40'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    {question.is_pinned && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-2">
                        <Pin size={9} /> Pinned
                      </div>
                    )}
                    <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {question.title}
                    </h1>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={togglePin}
                        disabled={pinning}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title={question.is_pinned ? 'Unpin question' : 'Pin question'}
                      >
                        {question.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button
                        onClick={handleDeleteQuestion}
                        disabled={deletingQuestion}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {question.body}
                </p>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  {question.author && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_BADGE[question.author.role] ?? ROLE_BADGE.apprentice}`}>
                      {question.author.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Clock size={9} />
                    {timeAgo(question.created_at)}
                  </span>
                  {question.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Answers */}
              {answers.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
                    {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                  </p>
                  <div className="space-y-3">
                    {answers.map(a => (
                      <div
                        key={a.id}
                        className={`relative group/answer bg-white dark:bg-slate-900 rounded-lg border p-4 md:p-5 ${
                          a.is_accepted
                            ? 'border-emerald-300 dark:border-emerald-600'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {a.is_accepted && (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                            <CheckCircle2 size={11} /> Accepted Answer
                          </div>
                        )}
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {a.body}
                        </p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          {a.author && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_BADGE[a.author.role] ?? ROLE_BADGE.apprentice}`}>
                              {a.author.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                            <Clock size={9} />
                            {timeAgo(a.created_at)}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteAnswer(a.id)}
                            disabled={deletingAnswer === a.id}
                            className="absolute top-3 right-3 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/answer:opacity-100 disabled:opacity-50"
                            title="Delete answer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer form */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  {answers.length === 0 ? 'Be the first to answer' : 'Add your answer'}
                </h2>
                <form onSubmit={handleAnswer} className="space-y-3">
                  <textarea
                    value={answerBody}
                    onChange={e => setAnswerBody(e.target.value)}
                    placeholder="Share what you know, what you'd try, or any relevant experience…"
                    rows={4}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                  {submitError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !answerBody.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Send size={11} />
                      {submitting ? 'Posting…' : 'Post Answer'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
