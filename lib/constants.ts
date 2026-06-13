export type Role   = 'admin' | 'manager' | 'journeyman' | 'apprentice'
export type Status = 'pending' | 'active' | 'suspended'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice',
}

export const ROLE_COLOR: Record<Role, string> = {
  admin:       'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  manager:     'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  journeyman:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  apprentice:  'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

export const STATUS_BADGE: Record<Status, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  active:    'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  suspended: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
}
