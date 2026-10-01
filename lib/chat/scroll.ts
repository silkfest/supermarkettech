/** What the message list should do when `messages` changes.
 *
 *  The chat used to scroll to the bottom on every change. A streaming answer
 *  changes `messages` on every chunk, so the view was dragged downward for as
 *  long as the answer took to write — reported from the field as "Ai chat
 *  scrolls while answering questions. Kinda annoying."
 *
 *  The rule instead: a new question goes to the top of the view and stays
 *  there. Deltas arriving against that same question move nothing, so the
 *  answer grows into the space below it and the reader works down it at their
 *  own pace.
 *
 *  Pure, so the behaviour can be tested without a browser; the component owns
 *  only the scrolling itself.
 */

export interface ScrollMsg {
  id: string
  role: string
}

export type ScrollAction =
  | { kind: 'none' }
  | { kind: 'end' }
  | { kind: 'pin'; id: string }

export function nextScrollAction(
  messages: readonly ScrollMsg[],
  pinnedQuestionId: string | null,
  jumpToEnd: boolean
): ScrollAction {
  // A conversation restored wholesale — a saved session or a draft — carries
  // no new question, and the last exchange is what you came back for.
  if (jumpToEnd) return { kind: 'end' }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')

  // Nothing asked yet, or this question is already pinned. The second case is
  // every streaming delta, and is exactly the chase this fixes.
  if (!lastUser || lastUser.id === pinnedQuestionId) return { kind: 'none' }

  return { kind: 'pin', id: lastUser.id }
}

/** The question the view should treat as pinned once `action` is carried out. */
export function pinnedAfter(
  action: ScrollAction,
  messages: readonly ScrollMsg[],
  pinnedQuestionId: string | null
): string | null {
  if (action.kind === 'pin') return action.id
  // Landing at the end adopts whatever question is already there, so the next
  // pass does not then yank it back up to the top.
  if (action.kind === 'end')
    return [...messages].reverse().find((m) => m.role === 'user')?.id ?? null
  return pinnedQuestionId
}
