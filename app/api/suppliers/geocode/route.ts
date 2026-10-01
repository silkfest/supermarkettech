import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { destinationText } from '@/lib/suppliers/maps'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/** Identifying the caller is required by Nominatim's usage policy. */
const USER_AGENT = 'ColdIQ/1.0 (HVACR training portal; supplier directory)'

/** Give one lookup room to be slow without taking the request down with it. */
const LOOKUP_TIMEOUT_MS = 8000

export const maxDuration = 30

interface Row {
  id: string
  label: string
  address: string
  city: string | null
  province: string
}

/** Geocode exactly ONE branch per request.
 *
 *  It used to do five, sleeping a second between them to respect Nominatim's
 *  rate limit. In practice a single lookup takes three to nine seconds, so a
 *  batch ran well past the serverless time limit and the function was killed
 *  partway through — which is why it stalled at eleven rows and then sat there.
 *
 *  So the waiting moved to the caller, where it belongs: one address per
 *  invocation keeps each request short, and the client spaces its calls out to
 *  stay inside the one-request-a-second policy. The client can also see
 *  progress between calls, which a server-side batch loop never let it do.
 *
 *  Only rows where lat is null are touched, so re-running is safe and a
 *  hand-corrected coordinate is never overwritten.
 */
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  // Rows the caller has already tried and that failed, so a bad address does
  // not wedge the run by being handed back forever.
  const skip: string[] = Array.isArray(body.skip) ? body.skip.slice(0, 200) : []

  let q = supabase
    .from('supplier_branches')
    .select('id, label, address, city, province')
    .is('lat', null)
    .eq('active', true)
    .limit(1)
  if (skip.length) q = q.not('id', 'in', `(${skip.join(',')})`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const remainingCount = async () => {
    const { count } = await supabase
      .from('supplier_branches')
      .select('id', { count: 'exact', head: true })
      .is('lat', null)
      .eq('active', true)
    return count ?? 0
  }

  const row = (data ?? [])[0] as Row | undefined
  if (!row) {
    return NextResponse.json({ done: true, geocoded: 0, remaining: await remainingCount() })
  }

  const query = destinationText(row)
  const fail = async (reason: string) =>
    NextResponse.json({
      done: false,
      geocoded: 0,
      // Named so the admin sees which branch is the problem, not just a count.
      failed: { id: row.id, label: row.label, query, reason },
      remaining: await remainingCount(),
    })

  try {
    const res = await fetch(
      `${NOMINATIM}?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`,
      {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      }
    )
    // A 429 or 403 here is the rate limit or a block, and saying so is the
    // difference between "try again later" and "this address is wrong".
    if (!res.ok) return await fail(`OpenStreetMap returned ${res.status}`)

    const hits = (await res.json()) as { lat?: string; lon?: string }[]
    const hit = hits?.[0]
    const lat = Number(hit?.lat)
    const lng = Number(hit?.lon)
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return await fail('No match for that address')
    }

    const { error: upErr } = await supabase
      .from('supplier_branches')
      .update({ lat, lng, geocoded_at: new Date().toISOString() })
      .eq('id', row.id)
    if (upErr) return await fail(upErr.message)

    return NextResponse.json({
      done: false,
      geocoded: 1,
      branch: { id: row.id, label: row.label, lat, lng },
      remaining: await remainingCount(),
      attribution: 'Geocoding © OpenStreetMap contributors',
    })
  } catch (e) {
    return await fail(e instanceof Error && e.name === 'TimeoutError'
      ? 'OpenStreetMap did not answer in time'
      : 'Could not reach OpenStreetMap')
  }
}
