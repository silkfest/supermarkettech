'use client'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Paperclip, Camera, AlertTriangle, RotateCcw, FileText, Globe, Loader2, ChevronRight } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { cn } from '@/lib/utils'
import type { ChatMode, Equipment, CitationSource } from '@/types'

const STARTERS: Record<ChatMode, string[]> = {
  ASK: [
    'What are the most common causes of high superheat?',
    'How does hot gas defrost work?',
    'Walk me through checking refrigerant charge',
    'What should suction pressure be on R-448A?',
  ],
  DIAGNOSE: [
    'Case temperature is above setpoint',
    'Compressor is short cycling',
    'Defrost cycle is not completing',
    'Unit is making an unusual noise',
  ],
  ALARM: [
    'What does alarm code E4 mean?',
    'Explain fault code F12',
    'I have a high discharge pressure alarm',
    'Walk me through clearing a defrost alarm',
  ],
  MAINTENANCE: [
    'Log a coil cleaning service visit',
    'What quarterly maintenance is due?',
    'Generate a service report summary',
    'What parts should I stock for this unit?',
  ],
  COMPLIANCE: [
    'Is R-404A compliant for new equipment?',
    'What are the EPA 608 requirements for service?',
    'What are the AIM Act refrigerant deadlines?',
    'Check our refrigerant management practices',
  ],
}

function SourcePill({ s }: { s: CitationSource }) {
  const Icon = s.sourceType === 'WEB' ? Globe : FileText
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[11px] text-slate-500 font-medium">
      <Icon size={10}/>
      <span className="max-w-[140px] truncate">{s.title}</span>
      {s.pageNumber && <span className="text-slate-400">p.{s.pageNumber}</span>}
    </span>
  )
}

interface Props {
  equipment: Equipment | null
  mode: ChatMode
  onUpload: () => void
}

export default function ChatPanel({ equipment, mode, onUpload }: Props) {
  const { messages, loading, error, send, clear, setError } = useChat({ equipmentId: equipment?.id, mode })
  const endRef    = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { clear() }, [equipment?.id, mode])

  function handleSend() {
    const t = draft.trim()
    if (!t || loading) return
    send(t)
    setDraft('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function resizeArea() {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Error bar */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <AlertTriangle size={13} className="flex-shrink-0"/>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <span className="text-xl">❄️</span>
            </div>
            {equipment ? (
              <>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">{equipment.name}</h3>
                <p className="text-xs text-slate-400 mb-6">{equipment.manufacturer} {equipment.model}{equipment.refrigerant ? ` · ${equipment.refrigerant}` : ''}</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Ask your refrigeration expert</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-xs">Select a unit for context-aware answers, or ask a general question.</p>
              </>
            )}
            <div className="w-full max-w-sm space-y-2">
              {STARTERS[mode].map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-left text-xs text-slate-600 hover:text-slate-800 transition-all group"
                >
                  <span>{s}</span>
                  <ChevronRight size={12} className="flex-shrink-0 text-slate-300 group-hover:text-slate-500"/>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto w-full">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                {/* Avatar */}
                <div className={cn(
                  'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5',
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                )}>
                  {msg.role === 'user' ? 'T' : 'AI'}
                </div>

                {/* Content */}
                <div className={cn('max-w-[85%]', msg.role === 'user' && 'flex flex-col items-end')}>
                  <div className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  )}>
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : msg.content === '' && msg.isStreaming ? (
                      /* Typing indicator */
                      <div className="flex items-center gap-1 py-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>
                        ))}
                      </div>
                    ) : (
                      <div className={cn('chat-prose', msg.isStreaming && msg.content && 'cursor-blink')}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Source citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                      {msg.sources.map(s => <SourcePill key={s.chunkId} s={s}/>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
        )}
      </div>

      {/* Clear button */}
      {!isEmpty && (
        <div className="flex justify-center pb-1">
          <button onClick={clear} className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-500 transition-colors">
            <RotateCcw size={10}/> Clear conversation
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-200 px-4 pb-4 pt-3 bg-white">
        {/* Quick actions */}
        <div className="flex gap-2 mb-2">
          <button onClick={onUpload} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
            <Paperclip size={11}/> Attach manual
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
            <Camera size={11}/> Photo
          </button>
          <button
            onClick={() => { setDraft('Alarm code: '); inputRef.current?.focus() }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <AlertTriangle size={11}/> Alarm code
          </button>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); resizeArea() }}
            onKeyDown={handleKey}
            placeholder="Describe a symptom, ask a question, or enter an alarm code…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
            style={{ minHeight: 48 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || loading}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading
              ? <Loader2 size={15} className="text-white animate-spin"/>
              : <Send size={15} className="text-white"/>
            }
          </button>
        </div>
        <p className="text-[10px] text-slate-300 mt-1.5 text-center">Shift+Enter for new line · Always verify safety-critical information with qualified personnel</p>
      </div>
    </div>
  )
}
