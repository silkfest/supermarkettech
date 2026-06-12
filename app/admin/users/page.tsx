'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { ROLE_LABEL as _RL, STATUS_BADGE } from '@/lib/constants'
import type { Role, Status } from '@/lib/constants'

interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  status: Status
  mentor_id: string | null
  created_at: string
  notify_requested_at: string | null
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / (60 * 1000)))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const sb = getSupabaseBrowser()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Own profile via browser client (reading own row is always allowed)
      const { data: profileData } = await sb.from('users').select('*').eq('id', user.id).single()
      const profile = profileData as unknown as UserRow | null
      if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
      setCurrentUser(profile)

      // All users via API route (service role bypasses RLS)
      const res = await fetch('/api/users')
      if (res.ok) {
        setUsers(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function updateUser(id: string, patch: Partial<UserRow>) {
    setSaving(id)
    setError(null)
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to update user — please try again')
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

  const statusBadge = (status: Status) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-baseline gap-0.5 flex-shrink-0">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800">IQ</span>
          </div>
          <span className="text-slate-400 flex-shrink-0">/</span>
          <span className="text-sm font-medium text-slate-700 truncate">User Management</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => router.push('/admin/technicians')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors hidden sm:block"
          >
            Technician Profiles →
          </button>
          <div className="text-xs text-slate-500">{users.length} users</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 text-base leading-none">×</button>
          </div>
        )}
        {/* Pending approvals banner */}
        {users.some(u => u.status === 'pending') && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
            <span>⏳</span>
            <span><strong>{users.filter(u => u.status === 'pending').length}</strong> user{users.filter(u => u.status === 'pending').length !== 1 ? 's' : ''} awaiting approval</span>
            {users.some(u => u.status === 'pending' && u.notify_requested_at) && (
              <span className="text-amber-700">
                · {users.filter(u => u.status === 'pending' && u.notify_requested_at).length} re-requested attention
              </span>
            )}
          </div>
        )}

        {/* ── Mobile card list (< md) ───────────────────────────────────────── */}
        <div className="md:hidden space-y-3">
          {users.map(user => (
            <div key={user.id}
              className={`bg-white rounded-xl border p-4 ${user.status === 'pending' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'}`}
            >
              {/* Name / email / status */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-slate-800 text-sm">{user.name || '—'}</span>
                    {statusBadge(user.status)}
                    {user.status === 'pending' && user.notify_requested_at && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                        🔔 requested {timeAgo(user.notify_requested_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                {saving === user.id && <Loader2 size={14} className="animate-spin text-blue-400 flex-shrink-0 mt-0.5"/>}
              </div>

              {/* Role + mentor selects */}
              <div className={`grid gap-2 mb-3 ${user.role === 'apprentice' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Role</label>
                  <select
                    value={user.role}
                    onChange={e => updateUser(user.id, { role: e.target.value as Role })}
                    disabled={saving === user.id || user.id === currentUser?.id}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="journeyman">Journeyman</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                {user.role === 'apprentice' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Mentor</label>
                    <select
                      value={user.mentor_id ?? ''}
                      onChange={e => updateUser(user.id, { mentor_id: e.target.value || null })}
                      disabled={saving === user.id}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">No mentor</option>
                      {journeymen.filter(j => j.id !== user.id).map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {user.status === 'pending' && (
                  <button
                    onClick={() => updateUser(user.id, { status: 'active' })}
                    disabled={saving === user.id}
                    className="flex-1 text-sm py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {user.status === 'active' && user.id !== currentUser?.id && (
                  <button
                    onClick={() => {
                      if (!confirm(`Suspend ${user.name || user.email}?`)) return
                      updateUser(user.id, { status: 'suspended' })
                    }}
                    disabled={saving === user.id}
                    className="flex-1 text-sm py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {user.status === 'suspended' && (
                  <button
                    onClick={() => {
                      if (!confirm(`Reactivate ${user.name || user.email}?`)) return
                      updateUser(user.id, { status: 'active' })
                    }}
                    disabled={saving === user.id}
                    className="flex-1 text-sm py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                )}
                <button
                  onClick={() => router.push(`/admin/technicians/${user.id}`)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
                >
                  Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop table (md+) ──────────────────────────────────────────────── */}
        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {statusBadge(user.status)}
                      {user.status === 'pending' && user.notify_requested_at && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                          🔔 {timeAgo(user.notify_requested_at)}
                        </span>
                      )}
                    </div>
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
                          onClick={() => {
                            if (!confirm(`Suspend ${user.name || user.email}? They will not be able to sign in.`)) return
                            updateUser(user.id, { status: 'suspended' })
                          }}
                          disabled={saving === user.id}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {saving === user.id ? '…' : 'Suspend'}
                        </button>
                      )}
                      {user.status === 'suspended' && (
                        <button
                          onClick={() => {
                            if (!confirm(`Reactivate ${user.name || user.email}?`)) return
                            updateUser(user.id, { status: 'active' })
                          }}
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
