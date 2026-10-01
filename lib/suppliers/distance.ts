/** Picking a branch: category preference first, distance second.
 *
 *  Nearest-wins on its own is wrong — it sends you to a lighting house for a
 *  compressor. So the order is: a brand that can only come from one place wins
 *  outright, then the chains we actually buy that category from in the order we
 *  prefer them, and distance only separates branches we would be equally happy
 *  to use.
 *
 *  Distance here is straight-line. It is a pre-filter and a tie-break, never a
 *  claim about drive time: the escarpment alone means a Hamilton branch three
 *  kilometres away can be fifteen minutes up the mountain. The UI says
 *  "approx." and hands the real routing to the Maps app.
 */

export interface Coords {
  lat: number
  lng: number
}

export interface RankableBranch {
  id: string
  supplierId: string
  lat: number | null
  lng: number | null
}

export interface RankableSupplier {
  id: string
  categories: string[]
  brands: string[]
}

export interface RankOptions {
  /** 'refrigeration' | 'electrical' | 'hvac' | 'hydronics' | undefined */
  category?: string
  /** A brand that only one chain carries, e.g. 'Carrier'. Case-insensitive. */
  brand?: string
  /** supplierId → rank within the category. Lower is preferred. */
  preference?: Record<string, number>
  limit?: number
}

export interface RankedBranch<B> {
  branch: B
  /** Straight-line kilometres, or null when the branch has no coordinates. */
  km: number | null
  /** Preference rank applied, if any. */
  rank: number | null
}

const EARTH_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Which chains are eligible for what is being bought. */
export function eligibleSuppliers(
  suppliers: readonly RankableSupplier[],
  opts: Pick<RankOptions, 'category' | 'brand'>
): RankableSupplier[] {
  // A brand that only one chain carries beats everything, distance included:
  // a Carrier part does not become available at Noble by being nearer.
  if (opts.brand) {
    const brand = opts.brand.toLowerCase()
    const own = suppliers.filter((s) =>
      s.brands.some((b) => b.toLowerCase() === brand)
    )
    if (own.length) return own
  }
  if (opts.category) {
    const cat = opts.category.toLowerCase()
    return suppliers.filter((s) =>
      s.categories.some((c) => c.toLowerCase() === cat)
    )
  }
  return [...suppliers]
}

/** Rank branches: preference first, then distance, then a stable id order.
 *
 *  Branches with no coordinates are not dropped — an un-geocoded branch is
 *  still a phone number worth having — but they sort after everything that
 *  can be measured. */
export function rankBranches<B extends RankableBranch>(
  branches: readonly B[],
  suppliers: readonly RankableSupplier[],
  origin: Coords | null,
  opts: RankOptions = {}
): RankedBranch<B>[] {
  const eligible = new Set(eligibleSuppliers(suppliers, opts).map((s) => s.id))
  const pref = opts.preference ?? {}

  const scored = branches
    .filter((b) => eligible.has(b.supplierId))
    .map((branch) => ({
      branch,
      km:
        origin && branch.lat !== null && branch.lng !== null
          ? haversineKm(origin, { lat: branch.lat, lng: branch.lng })
          : null,
      rank: pref[branch.supplierId] ?? null
    }))

  scored.sort((a, b) => {
    // Preferred chains first; an unranked chain sorts after every ranked one.
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER
    if (ra !== rb) return ra - rb
    // Then distance, with un-geocoded branches last rather than missing.
    const da = a.km ?? Number.MAX_VALUE
    const db = b.km ?? Number.MAX_VALUE
    if (da !== db) return da - db
    return a.branch.id < b.branch.id ? -1 : a.branch.id > b.branch.id ? 1 : 0
  })

  return opts.limit ? scored.slice(0, opts.limit) : scored
}

/** One decimal under 10 km, whole numbers above — nobody needs 12.37 km. */
export function formatKm(km: number | null): string {
  if (km === null) return ''
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
