'use client'

import { Zap } from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import PageHeader from '@/components/PageHeader'
import SafetyCircuitTrainer from '@/components/simulation/SafetyCircuitTrainer'

export default function SafetyCircuitPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <PageHeader title="Safety Circuit Trainer" home={false} back="/simulation" variant="learning" />
      <LearningTabBar />

      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-amber-500" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">C1 Control Circuit — 120 V</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Practice the classic hopscotch method on a Copeland Discus safety string, or try to find a hidden
            fault with the two-probe meter. The same trainer also lives inside the Hussmann Parallel Rack sim.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5">
          <SafetyCircuitTrainer />
        </div>
      </div>
    </div>
  )
}
