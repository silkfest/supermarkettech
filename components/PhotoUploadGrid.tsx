'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { AlertTriangle, Camera, Loader2, X } from 'lucide-react'
import { downscaleImage } from '@/lib/images/downscale'
import { photoSlotsLeft } from '@/lib/images/photo-cap'

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
  /** Hard cap on how many photos this grid will hold. Omit for no limit. */
  maxPhotos?: number
  /** Strips the card chrome so the grid can sit inside another card — used for
   *  the few photos kept against one piece of equipment. */
  compact?: boolean
}

export default function PhotoUploadGrid({
  photos,
  onChange,
  title = 'Photos',
  description = 'Tap the caption below each photo to add a label',
  maxPhotos,
  compact = false,
}: PhotoUploadGridProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState<string[]>([])

  const cap = maxPhotos ?? Number.POSITIVE_INFINITY
  const slots = photoSlotsLeft(photos.length, cap)
  const full = slots === 0

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files ?? [])
    // Reset the input immediately so picking the same file again still fires a
    // change event, and so the value isn't cleared mid-upload.
    e.target.value = ''
    if (!files.length) return

    // Picking four photos into two slots used to upload all four and then show
    // two, which reads as photos going missing. Drop the extras up front and
    // say which ones, so the tech can pick again rather than wonder.
    let overCap: string[] = []
    if (files.length > slots) {
      overCap = files.slice(slots).map(f => `${f.name} — only ${slots === 1 ? '1 photo' : `${slots} photos`} would fit`)
      files = files.slice(0, slots)
    }
    if (!files.length) {
      setFailed(overCap)
      return
    }

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
    // clobbered by a stale snapshot of the list. The cap is re-checked against
    // that latest list, since a photo may have been added elsewhere meanwhile.
    if (added.length) {
      onChange(prev => [...prev, ...added.slice(0, photoSlotsLeft(prev.length, cap))])
    }

    // Previously any failure was discarded silently, so a photo could vanish
    // with no indication it had ever been picked.
    setFailed([...results.flatMap(r => r.ok ? [] : [`${r.name} — ${r.reason}`]), ...overCap])
    setUploading(false)
  }

  function updateLabel(index: number, label: string) {
    onChange(prev => prev.map((p, i) => i === index ? { ...p, label } : p))
  }

  function removePhoto(index: number) {
    onChange(prev => prev.filter((_, i) => i !== index))
  }

  const counter = maxPhotos ? `${photos.length} of ${maxPhotos}` : null

  return (
    <div className={compact
      ? ''
      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6'}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <div>
          <h2 className={`font-semibold text-slate-800 dark:text-slate-200 ${compact ? 'text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400' : 'text-sm'}`}>
            {title}{counter ? <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">{counter}</span> : null}
          </h2>
          {description && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || full}
          title={full && maxPhotos ? `This unit already has its ${maxPhotos} photos — remove one to add another` : undefined}
          className={`flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-800 ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          {uploading ? 'Uploading…' : full ? 'Full' : 'Add Photos'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
      </div>
      {failed.length > 0 && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] text-amber-700 dark:text-amber-400">
            <p className="font-medium">
              {failed.length === 1 ? "A photo wasn't added" : `${failed.length} photos weren't added`}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {failed.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      )}
      {photos.length === 0 ? (
        <p className={`text-slate-400 dark:text-slate-500 ${compact ? 'text-[11px] py-2' : 'text-xs text-center py-6'}`}>
          {compact
            ? 'No photos on this unit yet — nameplate and anything you’re flagging'
            : 'No photos yet — tap “Add Photos” to attach images'}
        </p>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
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
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow"
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
