'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Layers, FlaskConical, GraduationCap, HelpCircle } from 'lucide-react'

const TABS = [
  { label: 'Knowledge Base', href: '/knowledge',           icon: Layers,        match: /^\/knowledge/ },
  { label: 'Simulators',     href: '/simulation',          icon: FlaskConical,  match: /^\/simulation/ },
  { label: 'Training',       href: '/apprentice/training', icon: GraduationCap, match: /^\/apprentice\/training/ },
  { label: 'Ask the Team',   href: '/ask',                 icon: HelpCircle,    match: /^\/ask/ },
]

export default function LearningTabBar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const router  = useRouter()
  const pathname = usePathname()

  if (variant === 'dark') {
    return (
      <div className="grid grid-cols-4 md:flex md:items-center md:gap-0.5 bg-slate-800 border-b border-slate-700">
        {TABS.map(tab => {
          const active = tab.match.test(pathname)
          const Icon = tab.icon
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-0.5 md:gap-1.5 px-1 md:px-3 py-2 text-[10px] md:text-xs font-medium text-center leading-tight border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 md:flex md:items-center md:gap-0.5 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      {TABS.map(tab => {
        const active = tab.match.test(pathname)
        const Icon = tab.icon
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-0.5 md:gap-1.5 px-1 md:px-3 py-2 md:py-2.5 text-[10px] md:text-xs font-medium text-center leading-tight border-b-2 transition-colors -mb-px ${
              active
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
