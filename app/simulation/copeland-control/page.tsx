import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'
import CopelandCircuitTrainer from '@/components/simulation/CopelandCircuitTrainer'

export default function CopelandControlPage() {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
    <PageHeader title="Copeland Demand Cooling" home={false} back="/simulation" variant="learning" />
    <LearningTabBar />
    <main className="max-w-6xl mx-auto px-4 py-6"><CopelandCircuitTrainer /></main>
  </div>
}
