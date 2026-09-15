'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import PageHeader from '@/components/PageHeader'
import SafetyCircuitTrainer, { type CircuitVariant } from '@/components/simulation/SafetyCircuitTrainer'

export default function SafetyCircuitPage() {
  const [variant, setVariant] = useState<CircuitVariant>('120')
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <PageHeader title="Safety Circuit Trainer" home={false} back="/simulation" variant="learning" />
      <LearningTabBar />

      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-amber-500" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">C1 Control Circuit — {variant === '208' ? '208 V single-phase' : '120 V'}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {variant === '208'
                ? 'Same safety string fed line-to-line. Both legs are hot, every point reads ~120 V to ground, and there is a second fuse on the L2 leg — the version that trips up new techs.'
                : 'Practice the classic hopscotch method on a Copeland Discus safety string, or try to find a hidden fault with the two-probe meter. The same trainer also lives inside the Hussmann Parallel Rack sim.'}
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
            {(['120', '208'] as CircuitVariant[]).map(v => (
              <button key={v} onClick={() => setVariant(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${variant === v ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {v === '120' ? '120 V' : '208 V 1Ø'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5">
          <SafetyCircuitTrainer variant={variant} />
        </div>
      </div>
    </div>
  )
}
