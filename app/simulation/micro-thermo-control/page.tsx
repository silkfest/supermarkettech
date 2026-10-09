import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import MicroThermoCircuitTrainer from '@/components/simulation/MicroThermoCircuitTrainer'

export default function MicroThermoControlPage() {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
    <PageHeader title="Micro Thermo Safety Circuit" home={false} back="/simulation" variant="learning" />
    <LearningTabBar />
    <main className="mx-auto max-w-6xl px-4 py-6"><MicroThermoCircuitTrainer /></main>
  </div>
}
