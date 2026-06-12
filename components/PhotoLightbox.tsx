'use client'

import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxPhoto {
  url: string
  label?: string
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

export default function PhotoLightbox({ photos, index, onClose, onIndexChange }: PhotoLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onClose, onIndexChange])

  const photo = photos[index]
  if (!photo) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2" title="Close">
        <X size={24} />
      </button>
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onIndexChange((index - 1 + photos.length) % photos.length) }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
            title="Previous"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onIndexChange((index + 1) % photos.length) }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
            title="Next"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}
      <div className="max-w-4xl max-h-[85dvh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.label || `Photo ${index + 1}`} className="max-w-full max-h-[75dvh] object-contain rounded-lg" />
        {photo.label && <p className="mt-3 text-sm text-white/80 text-center">{photo.label}</p>}
        {photos.length > 1 && <p className="mt-1 text-xs text-white/40">{index + 1} / {photos.length}</p>}
      </div>
    </div>
  )
}
