'use client'

import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Pin, Loader2 } from 'lucide-react'
import type { Announcement } from '@/types'

const DISMISSED_KEY = 'coldiq_dismissed_announcements'

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [acking, setAcking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/announcements').catch(() => null)
    if (!res?.ok) return
    const data: Announcement[] = await res.json()
    setDismissed(getDismissed())

    const pinned = data.filter(a => a.pinned)
    const latestUnpinned = data.find(a => !a.pinned)
    const visible = [...pinned, ...(latestUnpinned ? [latestUnpinned] : [])]
    setItems(visible)
  }, [])

  useEffect(() => { load() }, [load])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
  }

  async function acknowledge(id: string) {
    setAcking(id)
    await fetch(`/api/announcements/${id}/ack`, { method: 'POST' }).catch(() => null)
    setItems(prev => prev.map(a => a.id === id ? { ...a, acknowledged_by_me: true } : a))
    setAcking(null)
  }

  const visible = items.filter(a => a.requires_ack ? !a.acknowledged_by_me : !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="flex-shrink-0 flex flex-col">
      {visible.map(a => (
        <div key={a.id} className="flex items-start gap-2.5 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800">
          {a.pinned ? (
            <Pin size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Megaphone size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{a.title}</p>
              {a.users?.name && (
                <span className="text-[10px] text-blue-500 dark:text-blue-400">— {a.users.name}</span>
              )}
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300/90 leading-relaxed mt-0.5 whitespace-pre-wrap">{a.content}</p>
            {a.requires_ack && (
              <button onClick={() => acknowledge(a.id)} disabled={acking === a.id}
                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-medium rounded-lg">
                {acking === a.id && <Loader2 size={11} className="animate-spin"/>}
                I&apos;ve read this
              </button>
            )}
          </div>
          {!a.requires_ack && (
            <button onClick={() => dismiss(a.id)} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 leading-none flex-shrink-0 text-lg">×</button>
          )}
        </div>
      ))}
    </div>
  )
}
