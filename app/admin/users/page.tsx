'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Role = 'admin' | 'manager' | 'journeyman' | 'apprentice'
type Status = 'pending' | 'active' | 'suspended'

interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  status: Status
  mentor_id: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await sb.from('users').select('*').eq('id', user.id).single()
      const profile = profileData as unknown as UserRow | null
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      setCurrentUser(profile)

      const { data: allUsersData } = await sb
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      setUsers((allUsersData as unknown as UserRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function updateUser(id: string, patch: Partial<UserRow>) {
    setSaving(id)
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
    }
    setSaving(null)
  }

  const journeymen = users.filter(u => u.role === 'journeyman' || u.role === 'admin' || u.role === 'manager')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    )
  }

  const statusBadge = (status: Status) => {
    const map: Record<Status, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      active: 'bg-green-50 text-green-700 border-green-200',
      suspended: 'bg-red-50 text-red-700 border-red-200',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800">IQ</span>
          </div>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-slate-700">User Management</span>
        </div>
        <div className="text-xs text-slate-500">{users.length} users total</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Pending approvals banner */}
        {users.some(u => u.status === 'pending') && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
            <span>⏳</span>
            <span><strong>{users.filter(u => u.status === 'pending').length}</strong> user{users.filter(u => u.status === 'pending').length !== 1 ? 's' : ''} awaiting approval</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Mentor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className={user.status === 'pending' ? 'bg-amber-50/30' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{user.name || '—'}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {statusBadge(user.status)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => updateUser(user.id, { role: e.target.value as Role })}
                      disabled={saving === user.id || user.id === currentUser?.id}
                      className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="journeyman">Journeyman</option>
                      <option value="apprentice">Apprentice</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'apprentice' ? (
                      <select
                        value={user.mentor_id ?? ''}
                        onChange={e => updateUser(user.id, { mentor_id: e.target.value || null })}
                        disabled={saving === user.id}
                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 bg-white"
                      >
                        <option value="">No mentor</option>
                        {journeymen.filter(j => j.id !== user.id).map(j => (
                          <option key={j.id} value={j.id}>{j.name} ({j.role})</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.status === 'pending' && (
                        <button
                          onClick={() => updateUser(user.id, { status: 'active' })}
                          disabled={saving === user.id}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          {saving === user.id ? '…' : 'Approve'}
                        </button>
                      )}
                      {user.status === 'active' && user.id !== currentUser?.id && (
                        <button
                          onClick={() => updateUser(user.id, { status: 'suspended' })}
                          disabled={saving === user.id}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {saving === user.id ? '…' : 'Suspend'}
                        </button>
                      )}
                      {user.status === 'suspended' && (
                        <button
                          onClick={() => updateUser(user.id, { status: 'active' })}
                          disabled={saving === user.id}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                        >
                          {saving === user.id ? '…' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
