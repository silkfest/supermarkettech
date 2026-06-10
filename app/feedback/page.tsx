'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, MessageSquareWarning, Lightbulb, Bug, Loader2, CheckCircle2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { AppFeedbackType } from '@/types'

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500'
const lbl = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1'

export default function FeedbackPage() {
  const router = useRouter()
  const [type, setType] = useState<AppFeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    })()
  }, [router])

  async function submit() {
    if (!message.trim()) { setError('Please describe your feedback'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/app-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to send feedback'); return }
    setDone(true)
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Feedback</span>
      </div>

      <div className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
            <MessageSquareWarning size={16} className="text-blue-600 dark:text-blue-400"/>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">Send Feedback</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Suggest a feature or report a bug — your message goes straight to the team.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
          {done && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg">
              <CheckCircle2 size={14} className="flex-shrink-0"/>
              Thanks! Your feedback has been sent.
            </div>
          )}
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg">{error}</div>
          )}

          <div>
            <label className={lbl}>What kind of feedback is this?</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setType('suggestion')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${type === 'suggestion' ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}>
                <Lightbulb size={13}/> Suggestion
              </button>
              <button onClick={() => setType('bug')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${type === 'bug' ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}>
                <Bug size={13}/> Bug Report
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>{type === 'bug' ? 'What went wrong?' : 'What would you like to see?'}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className={inp}
              placeholder={type === 'bug' ? 'Describe the issue, what you expected, and steps to reproduce…' : 'Describe your idea…'} />
          </div>

          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}
