'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Upload, MessageSquare, BookOpen, AlertTriangle, Check, X, Wrench, ExternalLink, History, ArrowLeft, Zap, Snowflake, Wind, ImagePlus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Equipment, ChatMode, ChatDomain, ChatMessage, ChatImage, CitationSource, ComponentLink } from '@/types'

const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

// ── Mode display config ───────────────────────────────────────────────────────

const MODE_CONFIG: Record<ChatMode, { label: string; placeholder: string }> = {
  EXPERT:      { label: 'Expert',      placeholder: 'Ask anything — describe a fault, paste an alarm code, or ask a general question…' },
  MAINTENANCE: { label: 'Maintenance', placeholder: 'Ask about service procedures, PM intervals, or describe work done…' },
}

const DOMAIN_CONFIG: Record<ChatDomain, { label: string; icon: React.ReactNode }> = {
  REFRIGERATION: { label: 'Refrigeration', icon: <Snowflake size={11} /> },
  HVAC:          { label: 'HVAC',          icon: <Wind size={11} /> },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  equipment: Equipment | null
  mode: ChatMode
  onUpload: () => void
  initialSession?: { id: string; messages: ChatMessage[] } | null
}

interface StreamEvent {
  type: 'delta' | 'sources' | 'component_links' | 'done' | 'error'
  text?: string
  sources?: CitationSource[]
  componentLinks?: ComponentLink[]
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

function Citations({ sources, onOpenPdf }: { sources: CitationSource[]; onOpenPdf: (url: string, title: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s) => {
        const inner = (
          <>
            <span className="flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-full">
              {s.citationNumber}
            </span>
            <BookOpen size={9} className="flex-shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="font-medium truncate max-w-[140px]">{s.title}</span>
            {s.pageNumber != null && <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">p.{s.pageNumber}</span>}
            {s.signedUrl && <ExternalLink size={9} className="flex-shrink-0 text-slate-400" />}
          </>
        )
        const baseClass = 'flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400'
        return s.signedUrl ? (
          <button
            key={s.chunkId}
            onClick={() => onOpenPdf(pdfUrl(s.signedUrl!, s.pageNumber), s.title)}
            title={`Open ${s.title}${s.pageNumber != null ? `, p.${s.pageNumber}` : ''}`}
            className={`${baseClass} hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer`}
          >
            {inner}
          </button>
        ) : (
          <div key={s.chunkId} className={baseClass} title="Source document">
            {inner}
          </div>
        )
      })}
    </div>
  )
}

function ComponentLinks({ links }: { links: ComponentLink[] }) {
  const router = useRouter()
  if (!links.length) return null
  return (
    <div className="mt-2">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
        <Wrench size={9} />
        View in components registry
      </p>
      <div className="flex flex-wrap gap-1.5">
        {links.map(link => (
          <button
            key={link.catalogId}
            onClick={() => router.push(`/maintenance/components?highlight=${encodeURIComponent(link.catalogId)}`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
            title={link.manualTitle}
          >
            <Wrench size={10} className="text-blue-400 flex-shrink-0" />
            <span className="font-medium">{link.manufacturer}</span>
            <span className="text-blue-500">·</span>
            <span>{link.model}</span>
            <ExternalLink size={9} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

function pdfUrl(signedUrl: string, pageNumber?: number | null): string {
  return pageNumber != null ? `${signedUrl}#page=${pageNumber}` : signedUrl
}

// ── Local draft persistence ───────────────────────────────────────────────────
// Keeps the in-progress conversation in localStorage so an accidental refresh
// or navigation doesn't lose it. Keyed per-equipment so switching units
// restores that unit's own draft.
function draftKey(equipmentId?: string | null): string {
  return `coldiq_chat_draft_${equipmentId ?? 'none'}`
}

interface ChatDraft {
  messages: ChatMessage[]
  sessionId: string | null
  chatSaved: boolean
}

function processInlineCitations(content: string): string {
  // Match [Doc N] or [Doc N: any title text] — the model sometimes includes the full label
  return content.replace(/\[Doc (\d+)[^\]]*\]/g, (_, n) => `[${n}](#cite-${n})`)
}

function MessageBubble({ msg, onOpenPdf }: { msg: ChatMessage; onOpenPdf: (url: string, title: string) => void }) {
  const isUser = msg.role === 'user'
  const sources = msg.sources

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[82%]`}>
        {/* Avatar row for assistant */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-white font-bold tracking-tight">CQ</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">ColdIQ</span>
          </div>
        )}

        {/* Attached images */}
        {isUser && msg.images && msg.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
            {msg.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`data:${img.mediaType};base64,${img.data}`}
                alt="Attached photo"
                className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
              />
            ))}
          </div>
        )}

        {/* Bubble */}
        <div
          className={[
            'px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm shadow-sm',
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
                    code: ({ children }) => <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 overflow-x-auto text-xs font-mono mb-2">{children}</pre>,
                    hr:  () => <hr className="my-2 border-slate-200 dark:border-slate-600" />,
                    a: ({ href, children }) => {
                      const citeMatch = href?.match(/^#cite-(\d+)$/)
                      if (citeMatch) {
                        const n = parseInt(citeMatch[1], 10)
                        const source = sources?.find(s => s.citationNumber === n)
                        const tooltip = source
                          ? `${source.title}${source.pageNumber != null ? `, p.${source.pageNumber}` : ''}`
                          : `Source ${n}`
                        const badgeClass = 'inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-full mx-0.5 leading-none'
                        return source?.signedUrl ? (
                          <a href={pdfUrl(source.signedUrl, source.pageNumber)} target="_blank" rel="noopener noreferrer" title={tooltip} className="no-underline hover:opacity-75 transition-opacity">
                            <sup className={badgeClass}>{n}</sup>
                          </a>
                        ) : (
                          <sup className={`${badgeClass} cursor-default`} title={tooltip}>{n}</sup>
                        )
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a>
                    },
                  }}
                >
                  {processInlineCitations(msg.content)}
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
          <Citations sources={msg.sources} onOpenPdf={onOpenPdf} />
        )}

        {/* Component registry links — shown after streaming completes */}
        {!isUser && !msg.isStreaming && msg.componentLinks && msg.componentLinks.length > 0 && (
          <ComponentLinks links={msg.componentLinks} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ mode }: { mode: ChatMode }) {
  const modeHints: Record<ChatMode, string> = {
    EXPERT:      'Ask about a fault, alarm code, or refrigeration system. The AI draws on an in-depth knowledge base covering Copeland, Hussmann, Danfoss, Sporlan, Bitzer, and more — or from manuals you\'ve uploaded.',
    MAINTENANCE: 'Ask about PM intervals, service procedures, or describe work done and I\'ll help document it.',
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 select-none">
      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-sm">
        <MessageSquare size={18} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
        ColdIQ Expert
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
        {modeHints[mode]}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPanel({ equipment, mode, onUpload, initialSession }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [domain, setDomain]       = useState<ChatDomain>('REFRIGERATION')
  const [escalate, setEscalate]   = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<ChatImage[]>([])
  const [imageError, setImageError] = useState<string | null>(null)

  // Save conversation state
  const [pdfViewer, setPdfViewer] = useState<{ url: string; title: string } | null>(null)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [saveTitle,      setSaveTitle]      = useState('')
  const [savingChat,     setSavingChat]     = useState(false)
  const [chatSaved,      setChatSaved]      = useState(false)
  const [saveError,      setSaveError]      = useState('')

  const bottomRef        = useRef<HTMLDivElement>(null)
  const textareaRef      = useRef<HTMLTextAreaElement>(null)
  const imageInputRef    = useRef<HTMLInputElement>(null)
  const abortRef         = useRef<AbortController | null>(null)
  const lastSentMsgRef   = useRef('')
  const sessionIdRef     = useRef<string | null>(null)
  const assistantContentRef = useRef('')
  const appliedSessionRef   = useRef<string | null>(null)

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  // Pre-fill from ?q= URL param (Ask ColdIQ from knowledge pages) — fires on
  // every navigation even when the component is cached by the router.
  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) {
      setInput(q)
      // Strip the param so the prefill doesn't re-appear on back/forward
      const url = new URL(window.location.href)
      url.searchParams.delete('q')
      window.history.replaceState({}, '', url.toString())
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [searchParams])

  // Pre-fill from localStorage — used by simulator "Diagnose" button
  useEffect(() => {
    try {
      const prefill = localStorage.getItem('coldiq_prefill')
      if (prefill) {
        setInput(prefill)
        localStorage.removeItem('coldiq_prefill')
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    } catch { /* ignore – SSR or private browsing */ }
  }, [])

  // Reset chat when the selected equipment changes — restoring that unit's
  // saved draft from localStorage if one exists, so switching units and back
  // doesn't lose either conversation.
  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    setError(null)
    setInput('')
    setStreaming(false)
    setShowSavePrompt(false)
    setSaveTitle('')
    setSaveError('')
    setAttachedImages([])
    setImageError(null)

    try {
      const raw = localStorage.getItem(draftKey(equipment?.id))
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ChatDraft>
        if (draft.messages?.length) {
          setMessages(draft.messages)
          setSessionId(draft.sessionId ?? null)
          setChatSaved(!!draft.chatSaved)
          return
        }
      }
    } catch { /* corrupt or unavailable draft — fall through to a clean chat */ }

    setMessages([])
    setSessionId(null)
    setChatSaved(false)
  }, [equipment?.id])

  // Resume a saved conversation passed in from chat history (?session=...)
  useEffect(() => {
    if (!initialSession || appliedSessionRef.current === initialSession.id) return
    appliedSessionRef.current = initialSession.id
    setMessages(initialSession.messages)
    setSessionId(initialSession.id)
    setChatSaved(true)
  }, [initialSession])

  // Persist the current conversation to localStorage as a draft (debounced).
  // Attached images are stripped — base64 photos would quickly blow the
  // localStorage quota, so resumed drafts show the message text without them.
  useEffect(() => {
    const key = draftKey(equipment?.id)
    const finalised = messages.filter(m => !m.isStreaming).map(m => ({ ...m, images: undefined }))
    if (finalised.length === 0) {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
      return
    }
    const t = setTimeout(() => {
      try {
        const draft: ChatDraft = { messages: finalised, sessionId, chatSaved }
        localStorage.setItem(key, JSON.stringify(draft))
      } catch { /* storage unavailable or quota exceeded — draft is best-effort */ }
    }, 400)
    return () => clearTimeout(t)
  }, [messages, sessionId, chatSaved, equipment?.id])

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

  // Best-effort background save — keeps a server copy of the conversation up to
  // date as it grows, so it survives even if the local draft is lost (new
  // device, cleared storage, etc). Creates a session on the first exchange,
  // then updates it in place.
  const persistConversation = useCallback(async (allMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (allMessages.length < 2) return
    try {
      const sid = sessionIdRef.current
      if (sid) {
        await fetch(`/api/chat/sessions/${sid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
        })
      } else {
        const title = allMessages.find(m => m.role === 'user')?.content.slice(0, 80) || 'Untitled'
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages, equipmentId: equipment?.id, mode, title }),
        })
        if (res.ok) {
          const j = await res.json()
          if (j?.id) setSessionId(j.id)
        }
      }
    } catch { /* background save — failures are non-fatal */ }
  }, [equipment, mode])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    setImageError(null)
    const room = MAX_IMAGES - attachedImages.length
    if (room <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} photos per message.`)
      return
    }

    for (const file of files.slice(0, room)) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setImageError('Unsupported image type. Use JPEG, PNG, GIF, or WebP.')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError('Image too large — max 5MB per photo.')
        continue
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.slice(result.indexOf(',') + 1)
        setAttachedImages(prev => prev.length >= MAX_IMAGES
          ? prev
          : [...prev, { mediaType: file.type as ChatImage['mediaType'], data: base64 }])
      }
      reader.readAsDataURL(file)
    }
  }

  function removeAttachedImage(index: number) {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = useCallback(async (opts?: {
    overrideText?: string
    overrideHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  }) => {
    const images = attachedImages
    const rawText = (opts?.overrideText ?? input).trim()
    if ((!rawText && images.length === 0) || streaming) return
    const text = rawText || 'What do you see in this photo? Help me identify it and any relevant details.'

    lastSentMsgRef.current = text
    setInput('')
    setAttachedImages([])
    setImageError(null)
    setError(null)

    // Build history from finalised messages only (max 40 per schema)
    const history = opts?.overrideHistory ?? messages
      .filter(m => !m.isStreaming)
      .slice(-40)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Optimistically add user + placeholder assistant messages
    const userId      = crypto.randomUUID()
    const assistantId = crypto.randomUUID()

    const userMsg: ChatMessage = { id: userId, role: 'user', content: text, images: images.length ? images : undefined }
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true }

    assistantContentRef.current = ''
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
          equipmentId: equipment?.id,
          mode,
          domain: mode === 'EXPERT' ? domain : undefined,
          escalate: mode === 'EXPERT' ? escalate : undefined,
          message: text,
          images: images.length ? images : undefined,
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
      let pendingComponentLinks: ComponentLink[] | undefined

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
                assistantContentRef.current += event.text
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

            case 'component_links':
              if (event.componentLinks?.length) {
                pendingComponentLinks = event.componentLinks
              }
              break

            case 'done': {
                // Snapshot before reset — React batches state updaters and executes
                // them after the current synchronous block. Without snapshots the
                // closure would read the already-reset `undefined` values.
                const snapshotSources = pendingSources
                const snapshotLinks   = pendingComponentLinks
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, sources: snapshotSources, componentLinks: snapshotLinks }
                    : m
                ))
                setStreaming(false)
                pendingSources = undefined
                pendingComponentLinks = undefined
                persistConversation([...history, { role: 'user', content: text }, { role: 'assistant', content: assistantContentRef.current }])
                break
              }

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
  }, [input, streaming, messages, mode, equipment, domain, escalate, attachedImages, persistConversation])

  function handleRetry() {
    const text = lastSentMsgRef.current
    if (!text || streaming) return

    // In the HTTP-error path the assistant placeholder was already removed from `messages`,
    // so the last entry is the user message that failed. Remove it before re-submitting so
    // handleSubmit can re-add it cleanly.
    const lastMsg = messages[messages.length - 1]
    const cleanMessages = lastMsg?.role === 'user' ? messages.slice(0, -1) : messages

    const overrideHistory = cleanMessages
      .filter(m => !m.isStreaming)
      .slice(-40)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    setMessages(cleanMessages)
    handleSubmit({ overrideText: text, overrideHistory })
  }

  async function handleSaveChat() {
    if (!saveTitle.trim() || savingChat) return
    setSavingChat(true)
    setSaveError('')
    try {
      const messagesToSave = messages
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content }))

      // The conversation may already have been auto-saved in the background —
      // update that session's title rather than creating a duplicate.
      const res = sessionId
        ? await fetch(`/api/chat/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messagesToSave, title: saveTitle.trim() }),
          })
        : await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesToSave,
              equipmentId: equipment?.id,
              mode,
              title: saveTitle.trim(),
            }),
          })
      if (!res.ok) {
        const j = await res.json()
        setSaveError(j?.error ?? 'Failed to save')
        return
      }
      if (!sessionId) {
        const j = await res.json()
        if (j?.id) setSessionId(j.id)
      }
      setChatSaved(true)
      setShowSavePrompt(false)
    } catch {
      setSaveError('Network error — please try again')
    } finally {
      setSavingChat(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()  // no override — reads from input state
    }
  }

  const config    = MODE_CONFIG[mode]
  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">

      {/* ── PDF viewer modal ── */}
      {pdfViewer && (
        <div className="absolute inset-0 z-50 flex flex-col bg-slate-900">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <button
              onClick={() => setPdfViewer(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
              title="Back to chat"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-sm text-slate-200 font-medium truncate flex-1">{pdfViewer.title}</p>
            <button
              onClick={() => setPdfViewer(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <iframe
            src={pdfViewer.url}
            className="flex-1 w-full border-0"
            title={pdfViewer.title}
          />
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {!hasMessages ? (
          <EmptyState mode={mode} />
        ) : (
          <div className="max-w-2xl mx-auto w-full">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} onOpenPdf={(url, title) => setPdfViewer({ url, title })} />
            ))}

            {/* Error banner */}
            {error && (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
                {lastSentMsgRef.current && (
                  <button
                    onClick={handleRetry}
                    className="flex-shrink-0 font-semibold underline hover:no-underline whitespace-nowrap"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Save conversation bar ── shown after any completed exchange */}
      {!streaming && messages.length >= 2 && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2">
          <div className="max-w-2xl mx-auto w-full">
            {chatSaved ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 py-1">
                <Check size={13} /> Conversation saved
              </div>
            ) : showSavePrompt ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveChat(); if (e.key === 'Escape') setShowSavePrompt(false) }}
                  placeholder="Name this conversation…"
                  className="flex-1 text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                />
                <button
                  onClick={handleSaveChat}
                  disabled={savingChat || !saveTitle.trim()}
                  className="px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {savingChat ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Save
                </button>
                <button onClick={() => setShowSavePrompt(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={14} />
                </button>
                {saveError && <span className="text-xs text-red-500 ml-1">{saveError}</span>}
              </div>
            ) : (
              <button
                onClick={() => { setShowSavePrompt(true); setSaveTitle(messages[0]?.content?.slice(0, 80) ?? '') }}
                className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1"
              >
                <MessageSquare size={12} />
                Save this conversation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error shown in empty state */}
      {!hasMessages && error && (
        <div className="mx-4 mb-2 max-w-2xl mx-auto">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            {lastSentMsgRef.current && (
              <button
                onClick={handleRetry}
                className="flex-shrink-0 font-semibold underline hover:no-underline whitespace-nowrap"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3">
        <div className="max-w-2xl mx-auto w-full">
          {/* Domain & escalation controls — Expert mode only */}
          {mode === 'EXPERT' && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {(Object.keys(DOMAIN_CONFIG) as ChatDomain[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDomain(d)}
                    className={[
                      'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                      domain === d
                        ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
                    ].join(' ')}
                    title={`${DOMAIN_CONFIG[d].label} knowledge base`}
                  >
                    {DOMAIN_CONFIG[d].icon}
                    {DOMAIN_CONFIG[d].label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEscalate(e => !e)}
                className={[
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                  escalate
                    ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
                ].join(' ')}
                title="Use a more capable model for harder diagnoses (slower, higher cost per message)"
              >
                <Zap size={11} />
                Deep diagnosis
              </button>
            </div>
          )}
          {/* Attached image previews */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt="Attached photo"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    onClick={() => removeAttachedImage(i)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-900 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imageError && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mb-1.5">{imageError}</p>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/50 transition-all">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={streaming || attachedImages.length >= MAX_IMAGES}
              aria-label="Attach photo"
              title="Attach a photo (nameplate, fault screen, component, etc.)"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            >
              <ImagePlus size={16} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              rows={1}
              disabled={streaming}
              className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none outline-none leading-relaxed disabled:opacity-50 py-0.5"
              style={{ maxHeight: 140 }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={(!input.trim() && attachedImages.length === 0) || streaming}
              aria-label="Send message"
              className={[
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5',
                (input.trim() || attachedImages.length > 0) && !streaming
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed',
              ].join(' ')}
            >
              {streaming
                ? <Loader2 size={14} className="text-white animate-spin" />
                : <Send size={14} className={(input.trim() || attachedImages.length > 0) ? 'text-white' : 'text-slate-400'} />
              }
            </button>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 select-none">
              Enter to send, Shift+Enter for new line
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/chat-history')}
                className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="View saved conversations"
              >
                <History size={9} />
                History
              </button>
              <button
                onClick={onUpload}
                className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Upload a PDF manual for this unit"
              >
                <Upload size={9} />
                Upload manual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
