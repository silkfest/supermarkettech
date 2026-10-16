/** Keeping a half-finished PM report alive on the device.
 *
 *  A PM form is filled in over an hour in a mechanical room, on a phone, often
 *  on bad signal. Before this, nothing was kept: one stray refresh, one tab the
 *  phone reclaimed while the tech took a call, one flat battery, and the whole
 *  report was gone. That happened for real — a save was rejected, the page was
 *  reloaded to pick up the fix, and an hour of work went with it.
 *
 *  So the form is written to the device as it is filled in, and offered back on
 *  return. The logic here is pure so it can be tested; the React side only
 *  wires it to state.
 */

/** Bump when the stored shape changes in a way old drafts cannot satisfy.
 *  A draft from an older version is discarded rather than half-restored. */
export const DRAFT_VERSION = 1

/** After this long a draft is more likely to confuse than to help: the tech has
 *  moved on, and silently reviving last month's store name is worse than
 *  starting clean. */
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export interface Draft<T> {
  version: number
  savedAt: number
  data: T
}

export type FormKind = 'hvac-pm' | 'refrigeration-pm' | 'co2-pm'

/** One slot per form, and per report when editing an existing one, so a draft
 *  of report A can never be restored on top of report B. */
export function draftKey(kind: FormKind, editId?: string | null): string {
  return editId ? `coldiq.draft.${kind}.${editId}` : `coldiq.draft.${kind}.new`
}

export function serializeDraft<T>(data: T, now: number): string {
  return JSON.stringify({ version: DRAFT_VERSION, savedAt: now, data })
}

/** Parse stored text back into a draft, or null if it is unusable.
 *
 *  Returns null rather than throwing for anything malformed: a corrupt draft
 *  must never stop the form from loading. */
export function parseDraft<T>(raw: string | null): Draft<T> | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const d = parsed as Partial<Draft<T>>
  if (d.version !== DRAFT_VERSION) return null
  if (typeof d.savedAt !== 'number' || !Number.isFinite(d.savedAt)) return null
  if (d.data === undefined || d.data === null) return null
  return { version: d.version, savedAt: d.savedAt, data: d.data as T }
}

/** Whether a parsed draft is still worth offering back. */
export function isDraftFresh(draft: Draft<unknown> | null, now: number, maxAgeMs = DRAFT_MAX_AGE_MS): boolean {
  if (!draft) return false
  const age = now - draft.savedAt
  // A draft stamped in the future means a clock change, not a real draft.
  if (age < 0) return false
  return age <= maxAgeMs
}

/** How the form should describe the draft it just brought back. */
export function describeDraftAge(savedAt: number, now: number): string {
  const mins = Math.floor((now - savedAt) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

/** Whether this snapshot is worth storing.
 *
 *  An untouched form is not a draft. Writing one would mean every tech who
 *  merely opens the page is later told they have unsaved work. */
export function isWorthSaving<T extends object>(data: T, empty: T): boolean {
  return JSON.stringify(data) !== JSON.stringify(empty)
}

/* ------------------------------------------------------------------ *
 *  Device storage. Every call is guarded.
 * ------------------------------------------------------------------ */

/** localStorage throws in private mode, when site data is blocked, and when the
 *  quota is full. None of those may break the form, so every path is caught and
 *  the form simply carries on without a draft. */
function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function writeDraft<T>(key: string, data: T, now: number): boolean {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(key, serializeDraft(data, now))
    return true
  } catch {
    return false
  }
}

export function readDraft<T>(key: string, now: number): Draft<T> | null {
  const s = storage()
  if (!s) return null
  let raw: string | null
  try {
    raw = s.getItem(key)
  } catch {
    return null
  }
  const draft = parseDraft<T>(raw)
  if (!draft) {
    clearDraft(key)
    return null
  }
  if (!isDraftFresh(draft, now)) {
    clearDraft(key)
    return null
  }
  return draft
}

export function clearDraft(key: string): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(key)
  } catch {
    /* nothing to do: the draft is at worst stale, never harmful */
  }
}
