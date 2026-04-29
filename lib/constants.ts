export type Role   = 'admin' | 'manager' | 'journeyman' | 'apprentice'
export type Status = 'pending' | 'active' | 'suspended'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin', manager: 'Manager', journeyman: 'Journeyman', apprentice: 'Apprentice',
}

export const ROLE_COLOR: Record<Role, string> = {
  admin:       'bg-purple-100 text-purple-700',
  manager:     'bg-blue-100 text-blue-700',
  journeyman:  'bg-emerald-100 text-emerald-700',
  apprentice:  'bg-amber-100 text-amber-700',
}

export const STATUS_BADGE: Record<Status, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  active:    'bg-green-50 text-green-700 border-green-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
}
