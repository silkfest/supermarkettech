import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

export function statusDot(s: string) {
  return { OK: 'bg-emerald-400', WARNING: 'bg-amber-400', ALARM: 'bg-red-500', OFFLINE: 'bg-slate-400', UNKNOWN: 'bg-slate-300' }[s] ?? 'bg-slate-300'
}

export function statusBadge(s: string) {
  return {
    OK:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    ALARM:   'bg-red-50 text-red-700 border-red-200',
    OFFLINE: 'bg-slate-100 text-slate-600 border-slate-200',
    UNKNOWN: 'bg-slate-50 text-slate-500 border-slate-200',
  }[s] ?? 'bg-slate-50 text-slate-500 border-slate-200'
}

export function alarmColor(level: string) {
  return { CRITICAL: 'text-red-600 bg-red-50', WARNING: 'text-amber-600 bg-amber-50', INFO: 'text-blue-600 bg-blue-50' }[level] ?? 'text-slate-600 bg-slate-50'
}

export function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
