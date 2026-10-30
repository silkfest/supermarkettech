import { NextRequest, NextResponse } from 'next/server'
import { dispatchAccess, databaseError } from '@/lib/dispatch/server'
import { zonePreferenceInput } from '@/lib/dispatch/model'

/** The zones a member watches, saved per company.
 *
 *  A preference is private and is nobody's to set but its owner's — the row's
 *  policies and its trigger enforce both, so this route carries the session's
 *  own user id and never takes one from the request. The codes are checked
 *  against the company's real zones in the trigger for the same reason. */
export async function PUT(req: NextRequest) {
  const a = await dispatchAccess(req)
  if (a instanceof NextResponse) return a
  const body = await req.json().catch(() => null)
  const parsed = zonePreferenceInput.safeParse(body?.zones)
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Choose zones from the list.' },
      { status: 400 },
    )
  // Deduplicated and ordered, so what comes back reads like the chips do.
  const zones = [...new Set(parsed.data)].sort((x, y) => x - y)
  const { error } = await a.db
    .from('dispatch_zone_preferences')
    .upsert(
      { company_id: a.company, user_id: a.userId, zones },
      { onConflict: 'company_id,user_id' },
    )
  if (error) return databaseError(error)
  return NextResponse.json({ zones })
}
