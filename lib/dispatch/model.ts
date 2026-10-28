import { z } from 'zod'
const short = z.string().trim().max(200)
export const jobInput = z
  .object({
    store_name: short.min(1),
    store_number: short,
    address: z.string().trim().min(1).max(500),
    contact_name: short,
    contact_phone: short,
    simpro_reference: short,
    customer_reference: short,
    reason: z.string().trim().min(1).max(5000),
    trade: z.enum(['HVAC', 'Refrigeration']),
    zone: z.number().int().positive(),
    priority: z.number().int().min(1).max(4),
    assigned_to: z.string().uuid().nullable(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
    overtime_status: z.enum([
      'not_requested',
      'requested',
      'approved',
      'declined',
    ]),
  })
  .strict()
export const jobUpdate = jobInput.extend({
  version: z.number().int().positive(),
})
export type JobInput = z.infer<typeof jobInput>
export type JobRequest = {
  user_id: string
  note: string
  created_at: string
}
export type Job = JobInput & {
  id: string
  company_id: string
  version: number
  created_at: string
  /** Technicians who have asked for this call. Read-only on the board: asking
   *  records interest, and assignment stays a dispatcher's decision. */
  dispatch_job_requests?: JobRequest[]
}
export type Membership = {
  company_id: string
  role: string
  companies: { name: string }
}
export type Zone = { code: number; name: string }
export type Priority = {
  level: number
  label: string
  emergency: boolean
  response_hours: number | null
  overtime_approved: boolean
}
export type Technician = { user_id: string; display_name: string }
export type Context = {
  userId: string
  memberships: Membership[]
  zones: Zone[]
  priorities: Priority[]
  technicians: Technician[]
}
export const blankJob: JobInput = {
  store_name: '',
  store_number: '',
  address: '',
  contact_name: '',
  contact_phone: '',
  simpro_reference: '',
  customer_reference: '',
  reason: '',
  trade: 'Refrigeration',
  zone: 1,
  priority: 3,
  assigned_to: null,
  status: 'open',
  overtime_status: 'not_requested',
}
