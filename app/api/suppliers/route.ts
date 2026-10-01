import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { rankBranches, type RankableSupplier } from '@/lib/suppliers/distance'

interface BranchRow {
  id: string
  supplier_id: string
  label: string
  phone: string | null
  after_hours_phone: string | null
  address: string
  city: string | null
  province: string
  lat: number | null
  lng: number | null
  notes: string | null
}

/** The supplier list, optionally ranked for where the tech is standing.
 *
 *  Ranking happens here rather than in the browser so the preference order is
 *  applied the same way for the page and for the chat tool that will use this
 *  later. Pass lat/lng to rank; leave them off for a plain directory. */
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const origin =
    Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has('lat')
      ? { lat, lng }
      : null
  const category = url.searchParams.get('category') ?? undefined
  const brand = url.searchParams.get('brand') ?? undefined
  const limitParam = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined

  const supabase = getSupabaseServer()
  const [chains, branches, prefs] = await Promise.all([
    supabase.from('suppliers').select('*').eq('active', true).order('name'),
    supabase.from('supplier_branches').select('*').eq('active', true),
    supabase.from('supplier_category_preferences').select('*'),
  ])

  const err = chains.error ?? branches.error ?? prefs.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  const chainRows = (chains.data ?? []) as (RankableSupplier & { name: string })[]
  const branchRows = (branches.data ?? []) as BranchRow[]

  // Preference is per category, so it only applies when a category is asked for.
  const preference: Record<string, number> = {}
  if (category) {
    for (const p of (prefs.data ?? []) as { category: string; supplier_id: string; rank: number }[]) {
      if (p.category.toLowerCase() === category.toLowerCase()) preference[p.supplier_id] = p.rank
    }
  }

  const ranked = rankBranches(
    branchRows.map(b => ({ ...b, supplierId: b.supplier_id })),
    chainRows,
    origin,
    { category, brand, preference, limit }
  )

  const byId = new Map(chainRows.map(c => [c.id, c]))
  return NextResponse.json({
    origin,
    // Un-geocoded branches are still listed; the UI says so rather than
    // quietly pretending the list is complete.
    pendingGeocode: branchRows.filter(b => b.lat === null).length,
    suppliers: chainRows,
    branches: ranked.map(r => ({
      ...r.branch,
      supplier: byId.get(r.branch.supplier_id)?.name ?? null,
      km: r.km,
      preferenceRank: r.rank,
    })),
  })
}
