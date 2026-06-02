'use client'

import { useState } from 'react'
import { X, ZoomIn } from 'lucide-react'

export function RackStyle1Diagram() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <figure className="my-6">
        <figcaption className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Rack Style 1 — Standard Receiver Rack
        </figcaption>
        <div
          className="relative group cursor-zoom-in"
          onClick={() => setOpen(true)}
          role="button"
          aria-label="Click to expand diagram"
        >
          <img
            src="/diagrams/rack-style-1.svg"
            alt="Rack Style 1 — Standard Receiver Rack full refrigeration circuit schematic"
            className="w-full max-w-3xl mx-auto block border border-slate-200 rounded-lg bg-white"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
              <ZoomIn size={14} /> Tap to expand
            </div>
          </div>
        </div>
      </figure>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src="/diagrams/rack-style-1.svg"
            alt="Rack Style 1 — Standard Receiver Rack full refrigeration circuit schematic"
            className="max-w-full max-h-full rounded-lg bg-white"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
