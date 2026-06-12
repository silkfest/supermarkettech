'use client'

import { useState } from 'react'
import PhotoLightbox, { type LightboxPhoto } from './PhotoLightbox'

interface PhotoGalleryProps {
  photos: LightboxPhoto[]
  className?: string
}

export default function PhotoGallery({ photos, className }: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <div className={className ?? 'grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2'}>
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="space-y-1 text-left cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.label || `Photo ${i + 1}`}
              className="w-full h-44 object-cover rounded-lg border border-slate-200 dark:border-slate-700 print:h-auto print:max-h-64 print:object-contain print:rounded-none"
            />
            {p.label && <p className="text-xs text-slate-500 dark:text-slate-400">{p.label}</p>}
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      )}
    </>
  )
}
