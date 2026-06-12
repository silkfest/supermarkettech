'use client'
import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps'
import type { User } from '@/types'

interface Props {
  currentUser: User
  onClose: () => void
}

export default function OnboardingModal({ currentUser, onClose }: Props) {
  const steps = ONBOARDING_STEPS.filter(s => !s.adminOnly || currentUser.role === 'admin')
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const step = steps[index]
  const isLast = index === steps.length - 1
  const Icon = step.icon

  async function finish() {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ has_seen_onboarding: true }),
    }).catch(() => {})
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Getting started</h2>
          <button
            onClick={finish}
            disabled={saving}
            aria-label="Skip tour"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <X size={16}/>
          </button>
        </div>

        <div className="px-5 py-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
            <Icon className="text-blue-600 dark:text-blue-400" size={22}/>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === index ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex(i => i - 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={16}/>
              </button>
            )}
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Get started
              </button>
            ) : (
              <button
                onClick={() => setIndex(i => i + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                Next <ChevronRight size={14}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
