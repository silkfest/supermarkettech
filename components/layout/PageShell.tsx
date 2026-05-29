'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'

export default function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await sb.from('users').select('*').eq('id', user.id).single()
      if (data) setCurrentUser(data as User)
    }
    load()
  }, [router])

  return (
    <div className="md:flex md:h-screen md:overflow-hidden">
      <Sidebar
        equipment={[]}
        selected={null}
        mode="EXPERT"
        currentUser={currentUser}
        onSelect={() => {}}
        onMode={() => {}}
        onAdd={() => {}}
        minimal={true}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="md:flex-1 md:overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
