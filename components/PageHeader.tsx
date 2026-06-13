'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title shown after the "Cold IQ /" breadcrumb */
  title: ReactNode
  /** Home button destination. Pass `false` to hide. Defaults to '/dashboard'. */
  home?: string | false
  /** Back button behavior. `true` = router.back(), a string = fixed route, `false` = hide. */
  back?: boolean | string
  /** Right-aligned content (buttons, badges, etc.) */
  actions?: ReactNode
  /** Extra classes merged onto the header container */
  className?: string
  /** "learning" uses the lighter blue accent + slate-800 dark background used on Learning tab pages */
  variant?: 'default' | 'learning'
  /** Set false when nesting inside another sticky/safe-top wrapper (e.g. a multi-row header) */
  sticky?: boolean
}

export default function PageHeader({ title, home = '/dashboard', back = true, actions, className, variant = 'default', sticky = true }: PageHeaderProps) {
  const router = useRouter()
  const isLearning = variant === 'learning'

  return (
    <div className={cn(
      'bg-white px-4 md:px-6 py-4 flex items-center gap-3',
      isLearning ? 'dark:bg-slate-800' : 'dark:bg-slate-900',
      sticky && 'safe-top border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10',
      className
    )}>
      {home !== false && (
        <button
          onClick={() => router.push(home)}
          className="p-1.5 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Dashboard"
        >
          <Home size={18} />
        </button>
      )}
      {back !== false && (
        <button
          onClick={() => typeof back === 'string' ? router.push(back) : router.back()}
          className="p-1.5 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="flex items-baseline gap-0.5">
        <span className={cn('text-lg font-bold', isLearning ? 'text-blue-400' : 'text-blue-600')}>Cold</span>
        <span className={cn('text-lg font-bold text-slate-800', isLearning ? 'dark:text-white' : 'dark:text-slate-200')}>IQ</span>
      </div>
      <span className="text-slate-300 dark:text-slate-600">/</span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{title}</span>
      {actions && <div className="ml-auto flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
