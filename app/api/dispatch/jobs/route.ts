import { NextRequest, NextResponse } from 'next/server'
import { dispatchAccess, databaseError } from '@/lib/dispatch/server'
import { jobInput } from '@/lib/dispatch/model'
export async function GET(req: NextRequest) {
  const a = await dispatchAccess(req)
  if (a instanceof NextResponse) return a
  const page = Number(req.nextUrl.searchParams.get('page') ?? 0)
  if (!Number.isSafeInteger(page) || page < 0)
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
  let query = a.db
    .from('dispatch_jobs')
    // Requests ride along so the board shows who asked for a call without a
    // second round trip; their own policies decide what comes back.
    .select('*, dispatch_job_requests(user_id, note, created_at)', { count: 'exact' })
    .eq('company_id', a.company)
  for (const key of ['trade', 'priority', 'status', 'assigned_to']) {
    const value = req.nextUrl.searchParams.get(key)
    if (value) query = query.eq(key, value)
  }
  // A technician watches a set of zones rather than one, so zone arrives as a
  // comma-separated list. Parsed here rather than passed through: it reaches a
  // numeric column, and an unchecked string would be the database's problem.
  const zone = req.nextUrl.searchParams.get('zone')
  if (zone) {
    const codes = zone.split(',').map(Number)
    if (codes.some((c) => !Number.isSafeInteger(c) || c <= 0))
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })
    query = query.in('zone', codes)
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * 50, page * 50 + 49)
  if (error) return databaseError(error)
  return NextResponse.json({ jobs: data, total: count })
}
export async function POST(req: NextRequest) {
  const a = await dispatchAccess(req, true)
  if (a instanceof NextResponse) return a
  const input = jobInput.safeParse(await req.json().catch(() => null))
  if (!input.success)
    return NextResponse.json(
      { error: 'Check required fields and field lengths.' },
      { status: 400 },
    )
  const { data, error } = await a.db
    .from('dispatch_jobs')
    .insert({ ...input.data, company_id: a.company })
    .select()
    .single()
  if (error) return databaseError(error)
  return NextResponse.json(data, { status: 201 })
}
