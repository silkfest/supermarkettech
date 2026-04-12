'use client'
import { useState, useCallback, useRef } from 'react'
import type { ChatMode, CitationSource } from '@/types'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: CitationSource[]
  isStreaming?: boolean
}

let _id = 0
const uid = () => `m${++_id}`

export function useChat(opts: { equipmentId?: string; mode: ChatMode }) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const send = useCallback(async (content: string) => {
    if (loading) return
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl

    setError(null)
    const userMsg: Message = { id: uid(), role: 'user', content }
    const asstId = uid()
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setLoading(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          equipmentId: opts.equipmentId,
          mode:        opts.mode,
          message:     content,
          history,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) throw new Error(`API ${res.status}`)
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'delta') {
              setMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: m.content + ev.text } : m
              ))
            } else if (ev.type === 'sources') {
              setMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, sources: ev.sources } : m
              ))
            } else if (ev.type === 'done') {
              setSessionId(ev.sessionId)
              setMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, isStreaming: false } : m
              ))
            } else if (ev.type === 'error') {
              throw new Error(ev.message)
            }
          } catch { /* skip bad SSE lines */ }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError(err?.message ?? 'Something went wrong')
      setMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, content: m.content || 'An error occurred. Please try again.', isStreaming: false } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [loading, messages, sessionId, opts.equipmentId, opts.mode])

  const clear = useCallback(() => {
    abort.current?.abort()
    setMessages([])
    setSessionId(null)
    setError(null)
    setLoading(false)
  }, [])

  return { messages, loading, error, send, clear, setError }
}
