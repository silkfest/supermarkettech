'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  // Display name
  const [displayName, setDisplayName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
      // Fetch display name from users table
      supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const name = (data as { name?: string } | null)?.name ?? ''
          setDisplayName(name)
          setOriginalName(name)
        })
    })
  }, [])

  async function handleSaveName() {
    if (!displayName.trim()) { setNameError('Display name cannot be empty'); return }
    setSavingName(true); setNameError(''); setNameSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNameError('Not logged in'); setSavingName(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('users')
      .update({ name: displayName.trim() })
      .eq('id', user.id)

    setSavingName(false)
    if (error) {
      setNameError(error.message)
    } else {
      setOriginalName(displayName.trim())
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    }
  }

  async function handleChangePassword() {
    if (!newPassword) { setPasswordError('New password is required'); return }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setSavingPassword(true); setPasswordError(''); setPasswordSaved(false)

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordError('Current password is incorrect')
      setSavingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSaved(false), 4000)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-xs font-medium text-slate-700 mb-1'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600" title="Dashboard">
          <Home size={18} />
        </button>
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-medium text-slate-700">Settings</span>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
        {/* Account info */}
        {userEmail && (
          <div className="px-4 py-3 bg-slate-100 rounded-lg text-xs text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{userEmail}</span>
          </div>
        )}

        {/* Display Name */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Display Name</h2>
          <div>
            <label className={labelCls}>Name shown in reports</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={inputCls}
              placeholder="Your name"
            />
          </div>
          {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          {nameSaved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> Name updated successfully
            </div>
          )}
          <button
            onClick={handleSaveName}
            disabled={savingName || displayName === originalName}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {savingName && <Loader2 size={14} className="animate-spin" />}
            {savingName ? 'Saving…' : 'Save Name'}
          </button>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
          <div>
            <label className={labelCls}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={inputCls}
              placeholder="Your current password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={inputCls}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={inputCls}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
          {passwordSaved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> Password changed successfully
            </div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword && <Loader2 size={14} className="animate-spin" />}
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
