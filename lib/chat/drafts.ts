// Local (localStorage) chat-draft persistence helpers, shared between
// ChatPanel (which reads/writes drafts) and the sign-out flow (which must
// purge them). See ChatPanel.tsx for the full rationale: localStorage is
// shared by every account that has ever logged into this browser, so drafts
// must be scoped per-user and wiped on sign-out to avoid one tech's unsent
// conversation reappearing under another account on a shared/kiosk device.

export function draftKey(userId: string, equipmentId?: string | null): string {
  return `coldiq_chat_draft_${userId}_${equipmentId ?? 'none'}`
}

/** Call on sign-out — removes every cached chat draft for every account that
 *  has ever used this browser (including any left by a pre-fix key scheme). */
export function clearAllChatDrafts() {
  try {
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('coldiq_chat_draft_')) stale.push(k)
    }
    stale.forEach(k => localStorage.removeItem(k))
  } catch { /* storage unavailable */ }
}
