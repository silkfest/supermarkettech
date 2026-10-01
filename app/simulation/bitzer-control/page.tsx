import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import BitzerCircuitTrainer from '@/components/simulation/BitzerCircuitTrainer'

export default function BitzerControlPage() {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
    <PageHeader title="Bitzer Control Wiring" home={false} back="/simulation" variant="learning" />
    <LearningTabBar />
    <main className="max-w-6xl mx-auto px-4 py-6"><BitzerCircuitTrainer /></main>
  </div>
}
