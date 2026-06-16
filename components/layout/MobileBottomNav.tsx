'use client'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, WrenchIcon, BookOpen, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'expert',      icon: <MessageSquare size={22}/>, label: 'Expert',      href: '/dashboard' },
  { id: 'maintenance', icon: <WrenchIcon    size={22}/>, label: 'Maintenance', href: '/maintenance' },
  { id: 'knowledge',   icon: <BookOpen      size={22}/>, label: 'Knowledge',   href: '/knowledge' },
  { id: 'profile',     icon: <UserCircle    size={22}/>, label: 'Profile',     href: '/profile' },
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
              'relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors',
              isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500',
            ].join(' ')}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />
            )}
            <span>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
