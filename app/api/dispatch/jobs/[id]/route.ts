import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dispatchAccess, databaseError } from '@/lib/dispatch/server'
import { jobUpdate } from '@/lib/dispatch/model'
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await dispatchAccess(req, true)
  if (a instanceof NextResponse) return a
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
  const input = jobUpdate.safeParse(await req.json().catch(() => null))
  if (!input.success)
    return NextResponse.json(
      { error: 'Check required fields and field lengths.' },
      { status: 400 },
    )
  const { version, ...changes } = input.data
  const { data, error } = await a.db
    .from('dispatch_jobs')
    .update(changes)
    .eq('company_id', a.company)
    .eq('id', id)
    .eq('version', version)
    .select()
    .maybeSingle()
  if (error) return databaseError(error)
  if (!data)
    return NextResponse.json(
      {
        error:
          'This call changed or is unavailable. Refresh before editing again.',
      },
      { status: 409 },
    )
  return NextResponse.json(data)
}
