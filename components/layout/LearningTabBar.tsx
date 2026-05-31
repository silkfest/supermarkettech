'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Layers, FlaskConical, GraduationCap } from 'lucide-react'

const TABS = [
  { label: 'Knowledge Base', href: '/knowledge',           icon: Layers,       match: /^\/knowledge/ },
  { label: 'Rack Simulator', href: '/simulation',          icon: FlaskConical, match: /^\/simulation/ },
  { label: 'Training',       href: '/apprentice/training', icon: GraduationCap,match: /^\/apprentice\/training/ },
]

export default function LearningTabBar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const router  = useRouter()
  const pathname = usePathname()

  if (variant === 'dark') {
    return (
      <div className="flex items-center gap-0.5 px-4 bg-slate-800 border-b border-slate-700">
        {TABS.map(tab => {
          const active = tab.match.test(pathname)
          const Icon = tab.icon
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      {TABS.map(tab => {
        const active = tab.match.test(pathname)
        const Icon = tab.icon
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              active
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={12} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
