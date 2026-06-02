'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

interface TopicFigure {
  id: string
  page_number: number
  caption: string | null
  description: string | null
  url: string
}

interface Props {
  figures: TopicFigure[]
}

export default function TopicFigures({ figures }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (!figures.length) return null

  const current = lightbox !== null ? figures[lightbox] : null

  return (
    <>
      <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={14} className="text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Figures & Diagrams
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {figures.map((fig, idx) => (
            <button
              key={fig.id}
              onClick={() => setLightbox(idx)}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fig.url}
                alt={fig.caption || `Figure from page ${fig.page_number}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              {fig.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white leading-tight line-clamp-2">{fig.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {current && lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex-1 min-w-0">
              {current.caption && (
                <p className="text-sm font-medium text-slate-200 truncate">{current.caption}</p>
              )}
              {current.description && (
                <p className="text-xs text-slate-400 truncate">{current.description}</p>
              )}
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {lightbox + 1} / {figures.length}
            </span>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.caption || `Figure from page ${current.page_number}`}
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />

            {/* Prev */}
            {lightbox > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1) }}
                className="absolute left-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {/* Next */}
            {lightbox < figures.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1) }}
                className="absolute right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
