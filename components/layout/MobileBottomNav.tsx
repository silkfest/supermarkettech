'use client'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, WrenchIcon, BookOpen, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'expert',      icon: <MessageSquare size={20}/>, label: 'Expert',      href: '/dashboard' },
  { id: 'maintenance', icon: <WrenchIcon    size={20}/>, label: 'Maintenance', href: '/maintenance' },
  { id: 'knowledge',   icon: <BookOpen      size={20}/>, label: 'Knowledge',   href: '/knowledge' },
  { id: 'profile',     icon: <UserCircle    size={20}/>, label: 'Profile',     href: '/profile' },
] as const

interface Props {
  /** Dashboard only: clicking "Expert" switches chat mode instead of navigating. */
  onExpert?: () => void
  /** Dashboard only: whether the Expert tab should show as active (chat mode is EXPERT). */
  expertActive?: boolean
}

export default function MobileBottomNav({ onExpert, expertActive }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="safe-bottom md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-stretch">
      {NAV_ITEMS.map(item => {
        const isActive = item.id === 'expert' && onExpert
          ? !!expertActive
          : pathname?.startsWith(item.href)
        return (
          <button
            key={item.id}
            onClick={() => (item.id === 'expert' && onExpert) ? onExpert() : router.push(item.href)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500',
            ].join(' ')}
          >
            <span className={isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
