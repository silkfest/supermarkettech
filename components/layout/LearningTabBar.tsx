'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, FlaskConical, GraduationCap, HelpCircle, LayoutGrid } from 'lucide-react'
const TABS = [
  { label: 'Overview', href: '/learn', icon: LayoutGrid, match: /^\/learn/ },
  { label: 'Reference', href: '/knowledge', icon: BookOpen, match: /^\/knowledge/ },
  { label: 'Practice', href: '/simulation', icon: FlaskConical, match: /^\/(simulation|game)/ },
  { label: 'My training', href: '/apprentice/training', icon: GraduationCap, match: /^\/apprentice\/training/ },
  { label: 'Team', href: '/ask', icon: HelpCircle, match: /^\/ask/ },
]
export default function LearningTabBar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const pathname = usePathname()
  return <nav aria-label="Learning" className={`flex overflow-x-auto border-b px-2 md:px-6 ${variant === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
    {TABS.map(({ label, href, icon: Icon, match }) => {
      const active = match.test(pathname)
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`min-h-11 flex shrink-0 items-center gap-1.5 px-3 text-xs font-medium border-b-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${active ? (variant === 'dark' ? 'border-blue-400 text-blue-300' : 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300') : (variant === 'dark' ? 'border-transparent text-slate-300' : 'border-transparent text-slate-600 dark:text-slate-400')}`}>
        <Icon size={15}/>{label}
      </Link>
    })}
  </nav>
}
