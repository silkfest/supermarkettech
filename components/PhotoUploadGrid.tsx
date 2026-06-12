'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

export interface UploadPhoto {
  url: string
  label: string
}

interface PhotoUploadGridProps {
  photos: UploadPhoto[]
  onChange: (photos: UploadPhoto[]) => void
  title?: string
  description?: string
}

export default function PhotoUploadGrid({
  photos,
  onChange,
  title = 'Photos',
  description = 'Tap the caption below each photo to add a label',
}: PhotoUploadGridProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)

    // Upload all selected files in parallel — no prompt() blocking
    const results = await Promise.all(
      files.map(async (file) => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('label', '')   // label can be edited inline after upload
        const res = await fetch('/api/upload-report-photo', { method: 'POST', body: fd })
        if (!res.ok) return null
        const data = await res.json()
        return { url: data.url, label: data.label } as UploadPhoto
      })
    )
    onChange([...photos, ...results.filter((p): p is UploadPhoto => p !== null)])
    setUploading(false)
    e.target.value = ''
  }

  function updateLabel(index: number, label: string) {
    onChange(photos.map((p, i) => i === index ? { ...p, label } : p))
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          {uploading ? 'Uploading…' : 'Add Photos'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
      </div>
      {photos.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No photos yet — tap &ldquo;Add Photos&rdquo; to attach images</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.label || `Photo ${i + 1}`}
                className="w-full aspect-[4/3] object-cover rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <input
                value={p.label}
                onChange={e => updateLabel(i, e.target.value)}
                placeholder="Add label…"
                className="w-full mt-1 px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border border-transparent rounded hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="Remove photo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
