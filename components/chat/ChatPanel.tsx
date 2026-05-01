'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Upload, MessageSquare, BookOpen, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Equipment, ChatMode, ChatMessage, CitationSource } from '@/types'

// ── Mode display config ───────────────────────────────────────────────────────

const MODE_CONFIG: Record<ChatMode, { label: string; placeholder: string }> = {
  EXPERT:      { label: 'Expert',      placeholder: 'Ask anything — describe a fault, paste an alarm code, or ask a general question…' },
  MAINTENANCE: { label: 'Maintenance', placeholder: 'Ask about service procedures, PM intervals, or describe work done…' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  equipment: Equipment | null
  mode: ChatMode
  onUpload: () => void
}

interface StreamEvent {
  type: 'delta' | 'sources' | 'done' | 'error'
  text?: string
  sources?: CitationSource[]
  sessionId?: string
  message?: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '160ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '320ms' }} />
    </span>
  )
}

function Citations({ sources }: { sources: CitationSource[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <div
          key={s.chunkId}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-500"
          title={`Relevance: ${(s.relevanceScore * 100).toFixed(0)}%`}
        >
          <BookOpen size={9} className="flex-shrink-0 text-slate-400" />
          <span className="font-medium truncate max-w-[140px]">{s.title}</span>
          {s.pageNumber != null && (
            <span className="text-slate-400 flex-shrink-0">p.{s.pageNumber}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[82%]`}>
        {/* Avatar row for assistant */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-white font-bold tracking-tight">CQ</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">ColdIQ</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={[
            'px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm shadow-sm',
          ].join(' ')}
        >
          {/* Show typing dots while waiting for first token */}
          {msg.isStreaming && !msg.content
            ? <TypingDots />
            : isUser
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
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="bg-slate-100 rounded-lg p-3 overflow-x-auto text-xs font-mono mb-2">{children}</pre>,
                    hr:  () => <hr className="my-2 border-slate-200" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )
          }
          {/* Blinking cursor while streaming content */}
          {msg.isStreaming && msg.content && (
            <span className="inline-block w-0.5 h-3.5 bg-slate-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>

        {/* Citations — shown after streaming completes */}
        {!isUser && !msg.isStreaming && msg.sources && msg.sources.length > 0 && (
          <Citations sources={msg.sources} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ equipment, mode }: { equipment: Equipment | null; mode: ChatMode }) {
  const modeHints: Record<ChatMode, string> = {
    EXPERT:      'Ask anything — general refrigeration questions, fault symptoms, alarm codes, or specifics about the selected unit. No need to switch modes.',
    MAINTENANCE: 'Ask about PM intervals, service procedures, or describe work done and I\'ll help document it.',
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 select-none">
      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-sm">
        <MessageSquare size={18} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1.5">
        {equipment ? equipment.name : 'ColdIQ Expert'}
      </p>
      {equipment && (
        <p className="text-[11px] text-slate-400 mb-3">
          {equipment.manufacturer} {equipment.model}
          {equipment.refrigerant ? ` · ${equipment.refrigerant}` : ''}
        </p>
      )}
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        {modeHints[mode]}
      </p>
      {!equipment && (
        <p className="text-[11px] text-slate-300 mt-3 max-w-xs leading-relaxed">
          Select a unit from the sidebar to include live sensor data and alarm context in your conversation.
        </p>
      )}
      {equipment?.status === 'ALARM' && (
        <div className="mt-4 flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          <AlertTriangle size={12} />
          Active alarms detected — switch to Alarm mode for targeted help
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPanel({ equipment, mode, onUpload }: Props) {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [error, setError]         = useState<string | null>(null)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // Reset chat when the selected equipment changes
  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    setMessages([])
    setSessionId(undefined)
    setError(null)
    setInput('')
    setStreaming(false)
  }, [equipment?.id])

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [input])

  const handleSubmit = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setError(null)

    // Build history from finalised messages only (max 40 per schema)
    const history = messages
      .filter(m => !m.isStreaming)
      .slice(-40)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Optimistically add user + placeholder assistant messages
    const userId      = crypto.randomUUID()
    const assistantId = crypto.randomUUID()

    const userMsg: ChatMessage = { id: userId, role: 'user', content: text }
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: sessionId ?? null,
          equipmentId: equipment?.id,
          mode,
          message: text,
          history,
        }),
      })

      // Auth error — show friendly message, don't spin forever
      if (res.status === 401) {
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setError('Your session has expired. Please refresh the page and sign in again.')
        setStreaming(false)
        return
      }

      if (!res.ok) {
        let detail = ''
        try { const j = await res.json(); detail = j?.error ?? '' } catch {}
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setError(`Request failed (${res.status})${detail ? ': ' + detail : ''}. Please try again.`)
        setStreaming(false)
        return
      }

      // Read the SSE stream manually
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let pendingSources: CitationSource[] | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on newlines; keep any incomplete tail for the next chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          const raw = trimmed.slice('data: '.length).trim()
          if (!raw) continue

          let event: StreamEvent
          try { event = JSON.parse(raw) } catch { continue }

          switch (event.type) {
            case 'delta':
              if (event.text) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.text! }
                    : m
                ))
              }
              break

            case 'sources':
              if (event.sources?.length) {
                pendingSources = event.sources
              }
              break

            case 'done':
              if (event.sessionId) setSessionId(event.sessionId)
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, sources: pendingSources }
                  : m
              ))
              setStreaming(false)
              pendingSources = undefined
              break

            case 'error':
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m,
                      isStreaming: false,
                      content: m.content || (event.message ?? 'Something went wrong. Please try again.'),
                    }
                  : m
              ))
              setStreaming(false)
              break
          }
        }
      }

      // Safety net: if stream ended without a 'done' event, clear the spinner
      setStreaming(s => {
        if (s) {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          ))
        }
        return false
      })

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              isStreaming: false,
              content: m.content || 'Connection lost. Please check your network and try again.',
            }
          : m
      ))
      setStreaming(false)
    }
  }, [input, streaming, messages, mode, equipment, sessionId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const config    = MODE_CONFIG[mode]
  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {!hasMessages ? (
          <EmptyState equipment={equipment} mode={mode} />
        ) : (
          <div className="max-w-2xl mx-auto w-full">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Error banner */}
            {error && (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error shown in empty state */}
      {!hasMessages && error && (
        <div className="mx-4 mb-2 max-w-2xl mx-auto">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 py-3">
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              rows={1}
              disabled={streaming}
              className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none leading-relaxed disabled:opacity-50 py-0.5"
              style={{ maxHeight: 140 }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className={[
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5',
                input.trim() && !streaming
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-200 cursor-not-allowed',
              ].join(' ')}
            >
              {streaming
                ? <Loader2 size={14} className="text-white animate-spin" />
                : <Send size={14} className={input.trim() ? 'text-white' : 'text-slate-400'} />
              }
            </button>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[10px] text-slate-400 select-none">
              {equipment
                ? <><span className="font-medium text-slate-500">{equipment.name}</span> · </>
                : null
              }
              {config.label} mode · Enter to send, Shift+Enter for new line
            </span>
            <button
              onClick={onUpload}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors"
              title="Upload a PDF manual for this unit"
            >
              <Upload size={9} />
              Upload manual
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
