/** How many more photos a capped upload grid will accept.
 *
 *  Returns zero rather than a negative when the cap is already met or exceeded,
 *  so callers can use the result directly as a slice length — a negative would
 *  silently drop photos the tech had already taken.
 */
export function photoSlotsLeft(current: number, max: number): number {
  if (!Number.isFinite(max)) return Number.POSITIVE_INFINITY
  return Math.max(0, max - current)
}
