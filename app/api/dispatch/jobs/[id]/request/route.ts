import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dispatchAccess, databaseError } from '@/lib/dispatch/server'

/** A technician asking for a call. It records interest only — assignment stays
 *  a dispatcher's decision, so this never touches dispatch_jobs. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Read access is the bar to reach here; the row's own policies and trigger
  // decide whether this member may actually ask.
  const a = await dispatchAccess(req)
  if (a instanceof NextResponse) return a
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const note = z.string().trim().max(500).safeParse(body?.note ?? '')
  if (!note.success)
    return NextResponse.json({ error: 'Note is too long.' }, { status: 400 })

  const { data, error } = await a.db
    .from('dispatch_job_requests')
    .insert({ job_id: id, company_id: a.company, user_id: a.userId, note: note.data })
    .select()
    .single()
  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'You have already asked for this call.' }, { status: 409 })
    if (error.code === '42501')
      return NextResponse.json(
        { error: 'Only technicians can ask for a call.' },
        { status: 403 },
      )
    return databaseError(error)
  }
  return NextResponse.json(data, { status: 201 })
}

/** Withdrawing a request. A technician may take back their own; a dispatcher
 *  may clear one once they have acted on it. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await dispatchAccess(req)
  if (a instanceof NextResponse) return a
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
  // A dispatcher clearing someone else's names them; everyone else takes back
  // their own, and the delete policy refuses anything further.
  const target = req.nextUrl.searchParams.get('user')
  if (target && !z.string().uuid().safeParse(target).success)
    return NextResponse.json({ error: 'Invalid technician' }, { status: 400 })

  const { error } = await a.db
    .from('dispatch_job_requests')
    .delete()
    .eq('job_id', id)
    .eq('company_id', a.company)
    .eq('user_id', target ?? a.userId)
  if (error) return databaseError(error)
  return new NextResponse(null, { status: 204 })
}
