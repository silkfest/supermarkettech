'use client'
import { useEffect, useState, useRef, type FormEvent } from 'react'
import {
  RadioTower, Plus, RefreshCw, X, Eye, EyeOff, ChevronDown, ChevronUp, Hand,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import {
  blankJob,
  type Context,
  type Job,
  type JobInput,
} from '@/lib/dispatch/model'

const inputClass =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm'
/** A row of filter chips. Selects read as a form control; the board is a thing
 *  you glance at, so the current choice should be visible without opening
 *  anything. Colours follow the semantic table in CLAUDE.md. */
function Pills({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; urgent?: boolean }[]
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const chosen = value === option.value
          return (
            <button
              key={option.value || 'all'}
              type="button"
              aria-pressed={chosen}
              onClick={() => onChange(option.value)}
              className={[
                'min-h-9 rounded-full border px-3 text-xs font-medium transition-colors',
                chosen
                  ? option.urgent
                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
                    : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const buttonClass =
  'rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm disabled:opacity-40'
async function read(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to load dispatch')
  return data
}
export default function DispatchPage() {
  const [context, setContext] = useState<Context>({
    userId: '',
    memberships: [],
    zones: [],
    priorities: [],
    technicians: [],
  })
  const [company, setCompany] = useState(''),
    [jobs, setJobs] = useState<Job[]>([]),
    [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0)
  const [filters, setFilters] = useState({
      trade: '',
      zone: '',
      priority: '',
      status: '',
      assigned_to: '',
    }),
    [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Job | null | undefined>(undefined),
    [draft, setDraft] = useState<JobInput>({ ...blankJob })
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (editing !== undefined) dialogRef.current?.showModal()
  }, [editing])
  const [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState('')
  const actualRole = context.memberships.find(
    (m) => m.company_id === company,
  )?.role
  /** Admins can look at the board the way a technician sees it. This only ever
   *  narrows the UI — the API and its row-level policies still answer to the
   *  real membership, so previewing can never grant anything. */
  const [previewTech, setPreviewTech] = useState(false)
  const role = previewTech ? 'technician' : actualRole
  const canWrite = role === 'admin' || role === 'dispatcher'

  /** Calls on the board a technician has asked for. Nobody gets an email or a
   *  push for a request; the board is the page a dispatcher already has open,
   *  so the notice belongs on it. Counted over the loaded page. */
  const waiting = jobs.filter(
    (j) => (j.dispatch_job_requests ?? []).length > 0,
  ).length
  // A different company may not make you an admin, so never carry it across.
  useEffect(() => setPreviewTech(false), [company])
  /** Calls opened out. The board is for scanning, so a card shows its heading
   *  and a couple of lines of the reason until asked for the rest. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleCall = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  // Asking is a technician's to do. An admin previewing sees the control in
  // place but cannot use it — the server answers to their real membership.
  const canRequest = actualRole === 'technician'
  const [requesting, setRequesting] = useState('')
  async function askForCall(job: Job, withdraw: boolean) {
    setRequesting(job.id)
    setError('')
    try {
      const url = `/api/dispatch/jobs/${job.id}/request?company=${company}`
      const res = await fetch(url, { method: withdraw ? 'DELETE' : 'POST' })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Could not update your request.')
      } else setRefresh((v) => v + 1)
    } finally {
      setRequesting('')
    }
  }
  useEffect(() => {
    if (company) return
    let live = true
    setLoading(true)
    setError('')
    readFetch()
    async function readFetch() {
      try {
        const c = await fetch('/api/dispatch/context').then(read)
        if (live) {
          setContext(c)
          setCompany(c.memberships[0]?.company_id || '')
          if (!c.memberships.length) setLoading(false)
        }
      } catch (e) {
        if (live) {
          setError((e as Error).message)
          setLoading(false)
        }
      }
    }
    return () => {
      live = false
    }
  }, [company, refresh])
  useEffect(() => {
    if (!company) return
    let live = true
    setLoading(true)
    setError('')
    setJobs([])
    const query = new URLSearchParams({
      company,
      page: String(page),
      ...filters,
    })
    Promise.all([
      fetch(`/api/dispatch/context?company=${company}`).then(read),
      fetch(`/api/dispatch/jobs?${query}`).then(read),
    ])
      .then(([c, j]) => {
        if (live) {
          setContext(c)
          setJobs(j.jobs)
          setTotal(j.total)
        }
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [company, filters, page, refresh])
  function open(job: Job | null) {
    setEditing(job)
    setSaveError('')
    if (job) {
      const next = { ...blankJob }
      for (const key of Object.keys(next) as (keyof JobInput)[])
        Object.assign(next, { [key]: job[key] })
      setDraft(next)
    } else
      setDraft({
        ...blankJob,
        zone: context.zones[0]?.code ?? 1,
        priority:
          context.priorities.find((p) => p.level === 3)?.level ??
          context.priorities[0]?.level ??
          3,
      })
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      await fetch(
        `/api/dispatch/jobs${editing ? `/${editing.id}` : ''}?company=${company}`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editing ? { ...draft, version: editing.version } : draft,
          ),
        },
      ).then(read)
      setEditing(undefined)
      setRefresh((v) => v + 1)
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  function filter(key: keyof typeof filters, value: string) {
    setFilters({ ...filters, [key]: value })
    setPage(0)
  }
  const selectedPriority = context.priorities.find(
    (p) => p.level === draft.priority,
  )
  return (
    <PageShell>
      <main className="mx-auto max-w-7xl p-4 md:p-8 text-slate-900 dark:text-slate-100">
        <header className="safe-top mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <RadioTower size={16} /> Operations
            </p>
            <h1 className="text-2xl font-bold mt-1">Dispatch</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Service calls, priorities and technician assignments
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={buttonClass}
              aria-label="Refresh dispatch"
              onClick={() => setRefresh((v) => v + 1)}
              disabled={loading}
            >
              <RefreshCw size={18} />
            </button>
            {actualRole === 'admin' && (
              <button
                className={`${buttonClass} inline-flex items-center gap-2`}
                aria-pressed={previewTech}
                onClick={() => {
                  // Leaving an open editor behind would show a form the role
                  // being previewed cannot reach.
                  setEditing(undefined)
                  setPreviewTech((v) => !v)
                }}
              >
                {previewTech ? <EyeOff size={16} /> : <Eye size={16} />}
                {previewTech ? 'Back to admin view' : 'View as tech'}
              </button>
            )}
            {canWrite && (
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40"
                disabled={loading || !!error}
                onClick={() => open(null)}
              >
                <Plus size={16} /> New call
              </button>
            )}
          </div>
        </header>
        {previewTech && (
          <p className="mb-4 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
            Previewing the technician view. This changes what you see, not what
            you may do — your admin access is unchanged.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 p-4 text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
        {!loading && !error && !context.memberships.length && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="font-semibold">
              Dispatch access hasn’t been set up
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ask your company administrator to add your ColdIQ account to the
              dispatch team.
            </p>
          </div>
        )}
        {!!company && (
          <>
            <section aria-label="Dispatch filters" className="mb-6 space-y-3">
              {/* One company is the common case; the picker is noise unless a
                  member genuinely belongs to more than one. */}
              {context.memberships.length > 1 && (
                <label className="block text-xs space-y-1">
                  Company
                  <select
                    className={inputClass}
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value)
                      setPage(0)
                      setFilters({
                        trade: '',
                        zone: '',
                        priority: '',
                        status: '',
                        assigned_to: '',
                      })
                      setEditing(undefined)
                    }}
                  >
                    {context.memberships.map((m) => (
                      <option key={m.company_id} value={m.company_id}>
                        {m.companies.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Pills
                label="Trade"
                value={filters.trade}
                onChange={(v) => filter('trade', v)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'HVAC', label: 'HVAC' },
                  { value: 'Refrigeration', label: 'Refrigeration' },
                ]}
              />
              <Pills
                label="Zone"
                value={filters.zone}
                onChange={(v) => filter('zone', v)}
                options={[
                  { value: '', label: 'All' },
                  ...context.zones.map((z) => ({
                    value: String(z.code),
                    label: z.name,
                  })),
                ]}
              />
              <Pills
                label="Priority"
                value={filters.priority}
                onChange={(v) => filter('priority', v)}
                options={[
                  { value: '', label: 'All' },
                  ...context.priorities.map((p) => ({
                    value: String(p.level),
                    label: p.label,
                    urgent: p.emergency,
                  })),
                ]}
              />
              {/* Status and who a call is on are a dispatcher's concern. */}
              {canWrite && (
                <>
                  <Pills
                    label="Status"
                    value={filters.status}
                    onChange={(v) => filter('status', v)}
                    options={[
                      { value: '', label: 'All' },
                      ...['open', 'in_progress', 'completed', 'cancelled'].map(
                        (st) => ({
                          value: st,
                          label:
                            st.charAt(0).toUpperCase() +
                            st.slice(1).replace('_', ' '),
                        }),
                      ),
                    ]}
                  />
                  <label className="block text-xs space-y-1">
                    Technician
                    <select
                      className={inputClass}
                      value={filters.assigned_to}
                      onChange={(e) => filter('assigned_to', e.target.value)}
                    >
                      <option value="">All technicians</option>
                      {context.technicians.map((t) => (
                        <option key={t.user_id} value={t.user_id}>
                          {t.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </section>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Response windows are reference information only. Emergency
              priorities include overtime approval.
            </p>
            {loading ? (
              <p role="status" className="py-12 text-center">
                Loading dispatch…
              </p>
            ) : (
              !error && (
                <>
                  {canWrite && waiting > 0 && (
                    <p className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                      <Hand size={15} aria-hidden />
                      {waiting === 1
                        ? '1 call on this page has a technician asking for it.'
                        : `${waiting} calls on this page have technicians asking for them.`}
                    </p>
                  )}
                  <div className="flex justify-between mb-3 text-sm">
                    <span>
                      {total} call{total === 1 ? '' : 's'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {canWrite ? 'Dispatch workspace' : 'Read-only access'}
                    </span>
                  </div>
                  {!jobs.length && (
                    <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400">
                      No calls match these filters.
                    </p>
                  )}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {jobs.map((job) => {
                      const priority = context.priorities.find(
                        (p) => p.level === job.priority,
                      )
                      const isOpen = expanded.has(job.id)
                      const requests = job.dispatch_job_requests ?? []
                      const mine = requests.some(
                        (r) => r.user_id === context.userId,
                      )
                      const assignedName = job.assigned_to
                        ? context.technicians.find(
                            (t) => t.user_id === job.assigned_to,
                          )?.display_name || 'Inactive technician'
                        : 'Unassigned'
                      return (
                        <article
                          key={job.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap gap-2 text-xs mb-2">
                                <span
                                  className={
                                    priority?.emergency
                                      ? 'font-semibold text-red-600 dark:text-red-400'
                                      : 'font-semibold text-blue-600 dark:text-blue-400'
                                  }
                                >
                                  {priority?.label}
                                  {priority?.emergency ? ' · Emergency' : ''}
                                </span>
                                <span>{job.trade}</span>
                                {canWrite && requests.length > 0 && (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 font-medium text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                                    {requests.length} asking
                                  </span>
                                )}
                                <span className="text-slate-500 dark:text-slate-400">
                                  {job.status.replace('_', ' ')}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {assignedName}
                                </span>
                              </div>
                              <h2 className="font-semibold">
                                {job.store_name}
                                {job.store_number && ` · #${job.store_number}`}
                              </h2>
                            </div>
                            {canWrite && (
                              <button
                                className={buttonClass}
                                onClick={() => open(job)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {job.address}
                          </p>
                          <p
                            className={`text-sm mt-3 whitespace-pre-wrap break-words ${
                              isOpen ? '' : 'line-clamp-2'
                            }`}
                          >
                            {job.reason}
                          </p>
                          {isOpen && (
                          <dl className="grid grid-cols-2 gap-3 text-xs mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                            {[
                              [
                                'Zone',
                                context.zones.find((z) => z.code === job.zone)
                                  ?.name || String(job.zone),
                              ],
                              [
                                'Technician',
                                job.assigned_to
                                  ? context.technicians.find(
                                      (t) => t.user_id === job.assigned_to,
                                    )?.display_name || 'Inactive technician'
                                  : 'Unassigned',
                              ],
                              ['Simpro reference', job.simpro_reference || '—'],
                              [
                                'Customer work order',
                                job.customer_reference || '—',
                              ],
                              [
                                'Contact',
                                [job.contact_name, job.contact_phone]
                                  .filter(Boolean)
                                  .join(' · ') || '—',
                              ],
                              [
                                'Overtime',
                                job.overtime_status.replace('_', ' ') +
                                  (priority?.overtime_approved
                                    ? ' · priority approval'
                                    : ''),
                              ],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {label}
                                </dt>
                                <dd className="mt-1 break-words">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          )}
                          {isOpen && priority?.response_hours && (
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                              {priority.response_hours}-hour response reference
                            </p>
                          )}
                          {/* Who has asked for this call. Dispatchers act on
                              it; a technician sees their own ask reflected. */}
                          {requests.length > 0 && (
                            <p
                              className={`mt-3 text-xs ${
                                canWrite
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              Asked for by{' '}
                              {requests
                                .map(
                                  (r) =>
                                    context.technicians.find(
                                      (t) => t.user_id === r.user_id,
                                    )?.display_name ??
                                    (r.user_id === context.userId
                                      ? 'you'
                                      : 'a technician'),
                                )
                                .join(', ')}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={`${buttonClass} inline-flex items-center gap-1`}
                              aria-expanded={isOpen}
                              onClick={() => toggleCall(job.id)}
                            >
                              {isOpen ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                              {isOpen ? 'Less' : 'Details'}
                            </button>
                            {(canRequest || previewTech) && (
                              <button
                                type="button"
                                className={buttonClass}
                                disabled={!canRequest || requesting === job.id}
                                title={
                                  canRequest
                                    ? undefined
                                    : 'Technicians ask for calls — you are previewing'
                                }
                                onClick={() => askForCall(job, mine)}
                              >
                                {mine ? 'Withdraw request' : 'Ask for this call'}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                  {total > 50 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        className={buttonClass}
                        disabled={!page}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </button>
                      <span className="text-sm">
                        Page {page + 1} of {Math.ceil(total / 50)}
                      </span>
                      <button
                        className={buttonClass}
                        disabled={(page + 1) * 50 >= total}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}
        {editing !== undefined && (
          <dialog
            ref={dialogRef}
            aria-labelledby="call-title"
            className="safe-top fixed inset-0 z-50 max-w-none max-h-none w-full h-full overflow-y-auto bg-transparent backdrop:bg-slate-950/60 p-4 open:flex items-start justify-center text-slate-900 dark:text-slate-100"
            onCancel={(e) => {
              e.preventDefault()
              if (!saving) setEditing(undefined)
            }}
          >
            <form
              onSubmit={save}
              className="my-8 w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 p-5 shadow-xl"
            >
              <div className="flex justify-between items-center mb-5">
                <h2 id="call-title" className="text-lg font-semibold">
                  {editing ? 'Edit service call' : 'New service call'}
                </h2>
                <button
                  type="button"
                  disabled={saving}
                  aria-label="Close call"
                  onClick={() => setEditing(undefined)}
                >
                  <X size={20} />
                </button>
              </div>
              {saveError && (
                <p
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400 mb-4"
                >
                  {saveError}
                </p>
              )}
              <fieldset
                disabled={saving}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {(
                  [
                    'store_name',
                    'store_number',
                    'address',
                    'contact_name',
                    'contact_phone',
                    'simpro_reference',
                    'customer_reference',
                  ] as const
                ).map((key) => (
                  <label key={key} className="text-xs space-y-1">
                    {
                      {
                        store_name: 'Store name *',
                        store_number: 'Store number',
                        address: 'Address *',
                        contact_name: 'Contact name',
                        contact_phone: 'Contact phone',
                        simpro_reference: 'Simpro reference',
                        customer_reference: 'Customer work order',
                      }[key]
                    }
                    <input
                      autoFocus={key === 'store_name'}
                      required={key === 'store_name' || key === 'address'}
                      maxLength={key === 'address' ? 500 : 200}
                      type={key === 'contact_phone' ? 'tel' : 'text'}
                      className={inputClass}
                      value={draft[key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="text-xs space-y-1">
                  Trade
                  <select
                    className={inputClass}
                    value={draft.trade}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        trade: e.target.value as JobInput['trade'],
                      })
                    }
                  >
                    <option>Refrigeration</option>
                    <option>HVAC</option>
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  Zone
                  <select
                    className={inputClass}
                    value={draft.zone}
                    onChange={(e) =>
                      setDraft({ ...draft, zone: Number(e.target.value) })
                    }
                  >
                    {context.zones.map((z) => (
                      <option key={z.code} value={z.code}>
                        {z.code} · {z.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  Priority
                  <select
                    className={inputClass}
                    value={draft.priority}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        priority: Number(e.target.value),
                        overtime_status: 'not_requested',
                      })
                    }
                  >
                    {context.priorities.map((p) => (
                      <option key={p.level} value={p.level}>
                        {p.label} · {p.emergency ? 'Emergency' : 'Normal'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  Technician
                  <select
                    className={inputClass}
                    value={draft.assigned_to || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        assigned_to: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {draft.assigned_to &&
                      !context.technicians.some(
                        (t) => t.user_id === draft.assigned_to,
                      ) && (
                        <option value={draft.assigned_to}>
                          Inactive — reassign before saving
                        </option>
                      )}
                    {context.technicians.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  Status
                  <select
                    className={inputClass}
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as JobInput['status'],
                      })
                    }
                  >
                    {['open', 'in_progress', 'completed', 'cancelled'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="text-xs space-y-1 sm:col-span-2">
                  Reason for call *
                  <textarea
                    required
                    maxLength={5000}
                    rows={3}
                    className={inputClass}
                    value={draft.reason}
                    onChange={(e) =>
                      setDraft({ ...draft, reason: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  Overtime
                  <select
                    className={inputClass}
                    disabled={selectedPriority?.overtime_approved}
                    value={
                      selectedPriority?.overtime_approved
                        ? 'approved'
                        : draft.overtime_status
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        overtime_status: e.target
                          .value as JobInput['overtime_status'],
                      })
                    }
                  >
                    <option value="not_requested">Not requested</option>
                    <option value="requested">Requested</option>
                    <option value="approved" disabled={role !== 'admin'}>
                      Approved
                    </option>
                    <option value="declined" disabled={role !== 'admin'}>
                      Declined
                    </option>
                  </select>
                </label>
                <p className="text-xs self-center text-slate-500 dark:text-slate-400">
                  {selectedPriority?.overtime_approved
                    ? 'Overtime is approved by this emergency priority.'
                    : 'Company admins decide overtime requests.'}
                  {selectedPriority?.response_hours &&
                    ` ${selectedPriority.response_hours}-hour response reference; no timer or tracking.`}
                </p>
              </fieldset>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={saving}
                  onClick={() => setEditing(undefined)}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save call'}
                </button>
              </div>
            </form>
          </dialog>
        )}
      </main>
    </PageShell>
  )
}
