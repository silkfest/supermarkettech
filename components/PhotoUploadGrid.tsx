'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { AlertTriangle, Camera, Loader2, X } from 'lucide-react'
import { downscaleImage } from '@/lib/images/downscale'

export interface UploadPhoto {
  url: string
  label: string
}

interface PhotoUploadGridProps {
  photos: UploadPhoto[]
  /** Accepts an updater so appends are applied to the latest state — uploads are
   *  async and the caller may edit labels or remove a photo while one is in flight. */
  onChange: Dispatch<SetStateAction<UploadPhoto[]>>
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
  const [failed, setFailed] = useState<string[]>([])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Reset the input immediately so picking the same file again still fires a
    // change event, and so the value isn't cleared mid-upload.
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setFailed([])

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          // Shrink before upload: full-size phone photos run 3–5 MB, close
          // enough to the serverless body limit that some fail outright.
          const prepared = await downscaleImage(file)
          const fd = new FormData()
          fd.append('file', prepared)
          fd.append('label', '')   // label can be edited inline after upload
          const res = await fetch('/api/upload-report-photo', { method: 'POST', body: fd })
          if (!res.ok) {
            // 413 has no JSON body — the platform rejects it before the route runs.
            const reason = res.status === 413
              ? 'file too large'
              : (await res.json().catch(() => ({}))).error ?? `upload failed (${res.status})`
            return { ok: false as const, name: file.name, reason }
          }
          const data = await res.json()
          return { ok: true as const, photo: { url: data.url, label: data.label } as UploadPhoto }
        } catch {
          return { ok: false as const, name: file.name, reason: 'network error' }
        }
      })
    )

    const added = results.flatMap(r => r.ok ? [r.photo] : [])
    // Functional update: a label edit or removal during the upload must not be
    // clobbered by a stale snapshot of the list.
    if (added.length) onChange(prev => [...prev, ...added])

    // Previously any failure was discarded silently, so a photo could vanish
    // with no indication it had ever been picked.
    setFailed(results.flatMap(r => r.ok ? [] : [`${r.name} — ${r.reason}`]))
    setUploading(false)
  }

  function updateLabel(index: number, label: string) {
    onChange(prev => prev.map((p, i) => i === index ? { ...p, label } : p))
  }

  function removePhoto(index: number) {
    onChange(prev => prev.filter((_, i) => i !== index))
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
      {failed.length > 0 && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] text-amber-700 dark:text-amber-400">
            <p className="font-medium">
              {failed.length === 1 ? "A photo didn't upload" : `${failed.length} photos didn't upload`}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {failed.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      )}
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
