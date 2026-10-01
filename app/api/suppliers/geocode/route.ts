import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { destinationText } from '@/lib/suppliers/maps'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

/** Identifying the caller is required by Nominatim's usage policy. */
const USER_AGENT = 'ColdIQ/1.0 (HVACR training portal; supplier directory)'

/** Nominatim asks for no more than one request a second. */
const GAP_MS = 1100

/** Small batches: 1 req/sec against a serverless time limit means a few per
 *  call, with the client coming back for the rest. */
const DEFAULT_BATCH = 5
const MAX_BATCH = 10

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface Row {
  id: string
  address: string
  city: string | null
  province: string
}

/** Fill in coordinates for branches that have none.
 *
 *  Geocoding runs here rather than as a one-off script because new branches
 *  keep arriving — the CES list, anything a branch manager adds later — and a
 *  job that lives in the product gets run again. It is deliberately additive:
 *  it only touches rows where lat is null, so re-running it is safe and
 *  corrected coordinates are never overwritten.
 *
 *  OpenStreetMap, not Google: no API key, no billing, and the result is stored
 *  permanently so the lookup happens once per branch, ever. */
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const batch = Math.min(Number(body.batch) || DEFAULT_BATCH, MAX_BATCH)

  const { data, error } = await supabase
    .from('supplier_branches')
    .select('id, address, city, province')
    .is('lat', null)
    .eq('active', true)
    .limit(batch)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]
  const done: { id: string; lat: number; lng: number }[] = []
  const failed: { id: string; query: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    if (i > 0) await sleep(GAP_MS)
    const row = rows[i]
    const query = destinationText(row)
    try {
      const res = await fetch(
        `${NOMINATIM}?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } }
      )
      if (!res.ok) { failed.push({ id: row.id, query }); continue }
      const hits = await res.json() as { lat?: string; lon?: string }[]
      const hit = hits?.[0]
      const lat = Number(hit?.lat)
      const lng = Number(hit?.lon)
      if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        failed.push({ id: row.id, query })
        continue
      }
      await supabase
        .from('supplier_branches')
        .update({ lat, lng, geocoded_at: new Date().toISOString() })
        .eq('id', row.id)
      done.push({ id: row.id, lat, lng })
    } catch {
      failed.push({ id: row.id, query })
    }
  }

  const { count } = await supabase
    .from('supplier_branches')
    .select('id', { count: 'exact', head: true })
    .is('lat', null)
    .eq('active', true)

  return NextResponse.json({
    geocoded: done.length,
    // A unit number in a business park is the usual reason one misses; those
    // get reported rather than silently left behind.
    failed,
    remaining: count ?? 0,
    attribution: 'Geocoding © OpenStreetMap contributors',
  })
}
