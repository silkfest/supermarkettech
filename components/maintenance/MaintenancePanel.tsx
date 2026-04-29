'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MaintenanceLog {
  id: string
  equipment_id: string
  technician_id: string
  title: string
  notes: string | null
  work_done: string | null
  next_action: string | null
  performed_at: string
  created_at: string
  users?: { name: string; role: string } | null
}

interface Props {
  equipmentId?: string
}

export default function MaintenancePanel({ equipmentId }: Props) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [workDone, setWorkDone] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [performedAt, setPerformedAt] = useState(
    new Date().toISOString().slice(0, 16)
  )

  async function fetchLogs() {
    setLoading(true)
    setFetchError('')
    const url = equipmentId
      ? `/api/maintenance-logs?equipmentId=${equipmentId}`
      : '/api/maintenance-logs'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setLogs(data)
    } else {
      setFetchError('Failed to load maintenance logs')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId])

  function resetForm() {
    setTitle('')
    setNotes('')
    setWorkDone('')
    setNextAction('')
    setPerformedAt(new Date().toISOString().slice(0, 16))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!equipmentId) { setError('No equipment selected'); return }
    if (!title.trim()) { setError('Title is required'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/maintenance-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment_id: equipmentId,
        title,
        notes: notes || null,
        work_done: workDone || null,
        next_action: nextAction || null,
        performed_at: new Date(performedAt).toISOString(),
      }),
    })

    if (res.ok) {
      resetForm()
      setShowModal(false)
      await fetchLogs()
    } else {
      const { error: err } = await res.json()
      setError(err ?? 'Failed to save log')
    }
    setSubmitting(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">Maintenance Log</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/maintenance${equipmentId ? `?equipmentId=${equipmentId}` : ''}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            PM Forms
          </Link>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log entry
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-slate-400 py-8">Loading…</div>
        ) : fetchError ? (
          <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <span>{fetchError}</span>
            <button onClick={fetchLogs} className="ml-3 font-medium underline hover:no-underline">Retry</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🔧</div>
            <p className="text-sm text-slate-500">No maintenance logs yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              {equipmentId ? 'Log the first entry for this equipment.' : 'Select equipment or log an entry.'}
            </p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-slate-800">{log.title}</h3>
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(log.performed_at)}</span>
              </div>
              {log.users && (
                <p className="text-xs text-slate-500 mb-2">
                  By <span className="font-medium">{log.users.name}</span>
                  <span className="ml-1 text-slate-400">({log.users.role})</span>
                </p>
              )}
              {log.notes && (
                <p className="text-xs text-slate-600 mb-2">{log.notes}</p>
              )}
              {log.work_done && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Work done</p>
                  <p className="text-xs text-slate-700">{log.work_done}</p>
                </div>
              )}
              {log.next_action && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-amber-600 mb-0.5">Next action</p>
                  <p className="text-xs text-slate-700">{log.next_action}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Log maintenance entry</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Compressor inspection"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={performedAt}
                  onChange={e => setPerformedAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observations, readings, conditions…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Work done</label>
                <textarea
                  value={workDone}
                  onChange={e => setWorkDone(e.target.value)}
                  rows={2}
                  placeholder="Parts replaced, repairs made…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Next action</label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  placeholder="Follow-up task or scheduled check…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving…' : 'Save entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
