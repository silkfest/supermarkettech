'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { GLIDE_SLIDES } from '@/lib/game/glide-slides'

/** Paged rather than a scroll: one idea per screen is the point, and the deck
 *  has to read the same on a phone at the rack as it does in the classroom. */
export default function PtGlideSlides({
  dark = false,
  onClose
}: {
  dark?: boolean
  onClose?: () => void
}) {
  const [i, setI] = useState(0)
  const s = GLIDE_SLIDES[i]
  const last = GLIDE_SLIDES.length - 1
  const shell = dark
    ? 'bg-slate-900 border-slate-600 text-slate-100'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white'
  const muted = dark
    ? 'text-slate-300'
    : 'text-slate-700 dark:text-slate-300'
  const chip = dark
    ? 'border-slate-600 bg-slate-800'
    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
  const btn = dark
    ? 'border-slate-600 bg-slate-800 disabled:opacity-40'
    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 disabled:opacity-40'
  return (
    <section
      className={`rounded-xl border p-3 space-y-3 ${shell}`}
      aria-label="Dew point versus bubble point"
    >
      <div className="flex items-start gap-2">
        <p className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 flex-1">
          Dew vs bubble &middot; slide {i + 1} of {GLIDE_SLIDES.length}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close the dew versus bubble slides"
            className="-mt-1 -mr-1 p-1 rounded hover:bg-slate-500/20"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <h3 className="font-bold text-[13px] leading-tight">{s.heading}</h3>
      {s.body.map((p, n) => (
        <p key={n} className={`text-[12.5px] leading-relaxed ${muted}`}>
          {p}
        </p>
      ))}
      {s.bullets && (
        <ul className="space-y-1.5">
          {s.bullets.map((b, n) => (
            <li
              key={n}
              className={`text-[12px] leading-relaxed pl-4 relative ${muted}`}
            >
              <span className="absolute left-0 top-[7px] w-1.5 h-1.5 rounded-full bg-amber-500" />
              {b}
            </li>
          ))}
        </ul>
      )}
      {s.table && (
        <div className={`rounded-lg border overflow-hidden ${chip}`}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left">
                {s.table.head.map((h) => (
                  <th key={h} className="px-2 py-1.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((r) => (
                <tr key={r[0]} className="border-t border-slate-500/20">
                  {r.map((c, n) => (
                    <td
                      key={n}
                      className={`px-2 py-1.5 ${n === 3 ? 'font-bold text-amber-600 dark:text-amber-400' : muted}`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className={`min-h-11 px-3 rounded-lg border text-xs flex items-center gap-1 ${btn}`}
        >
          <ChevronLeft size={13} /> Back
        </button>
        <div className="flex-1 flex justify-center gap-1.5" aria-hidden>
          {GLIDE_SLIDES.map((_, n) => (
            <span
              key={n}
              className={`w-1.5 h-1.5 rounded-full ${n === i ? 'bg-amber-500' : 'bg-slate-400/40'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setI((v) => Math.min(last, v + 1))}
          disabled={i === last}
          className={`min-h-11 px-3 rounded-lg border text-xs flex items-center gap-1 ${btn}`}
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </section>
  )
}
