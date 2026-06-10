'use client'

import { useState, useEffect, useCallback } from 'react'
import { Megaphone } from 'lucide-react'
import type { Announcement } from '@/types'

const DISMISSED_KEY = 'coldiq_dismissed_announcement'

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/announcements?limit=1').catch(() => null)
    if (!res?.ok) return
    const data: Announcement[] = await res.json()
    const latest = data[0] ?? null
    setAnnouncement(latest)
    setDismissed(latest ? localStorage.getItem(DISMISSED_KEY) === latest.id : false)
  }, [])

  useEffect(() => { load() }, [load])

  if (!announcement || dismissed) return null

  function dismiss() {
    if (!announcement) return
    localStorage.setItem(DISMISSED_KEY, announcement.id)
    setDismissed(true)
  }

  return (
    <div className="flex-shrink-0 flex items-start gap-2.5 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800">
      <Megaphone size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{announcement.title}</p>
          {announcement.users?.name && (
            <span className="text-[10px] text-blue-500 dark:text-blue-400">— {announcement.users.name}</span>
          )}
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300/90 leading-relaxed mt-0.5 whitespace-pre-wrap">{announcement.content}</p>
      </div>
      <button onClick={dismiss} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 leading-none flex-shrink-0 text-lg">×</button>
    </div>
  )
}
