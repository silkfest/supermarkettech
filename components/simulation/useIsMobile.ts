'use client'
import { useEffect, useState } from 'react'

/**
 * True below the given viewport width (default: Tailwind `sm` = 640px).
 * SSR-safe: first render returns false; updates after mount and on resize/rotate.
 * Used to pick the portrait rack-schematic layout on phones.
 */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpointPx])
  return isMobile
}
