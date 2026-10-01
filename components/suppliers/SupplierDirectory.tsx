'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  Phone, Navigation, Search, MapPin, Loader2, AlertTriangle, Clock
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { formatKm } from '@/lib/suppliers/distance'
import { directionsUrl, telHref } from '@/lib/suppliers/maps'

interface Branch {
  id: string
  supplier: string | null
  label: string
  phone: string | null
  after_hours_phone: string | null
  address: string
  city: string | null
  province: string
  lat: number | null
  lng: number | null
  notes: string | null
  km: number | null
  preferenceRank: number | null
}

interface Payload {
  branches: Branch[]
  pendingGeocode: number
  origin: { lat: number; lng: number } | null
}

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'refrigeration', label: 'Refrigeration' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'hvac', label: 'HVAC' },
  { key: 'hydronics', label: 'Hydronics' },
]

/** The supplier list, nearest first once the tech says where they are.
 *
 *  Distance is straight-line and labelled as approximate — the Directions
 *  button hands the real routing to the Maps app, which knows about the
 *  escarpment and the traffic and we do not. */
export default function SupplierDirectory({ isAdmin = false }: { isAdmin?: boolean }) {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (origin) { params.set('lat', String(origin.lat)); params.set('lng', String(origin.lng)) }
    const { data: { session } } = await getSupabaseBrowser().auth.getSession()
    const res = await fetch(`/api/suppliers?${params}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    })
    setLoading(false)
    if (!res.ok) { setError('Could not load suppliers'); return }
    setData(await res.json())
  }, [category, origin])

  useEffect(() => { void load() }, [load])

  function locate() {
    if (!navigator.geolocation) { setLocError('This device will not share a location'); return }
    setLocating(true); setLocError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        setLocError('Location declined — the list stays alphabetical')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  async function geocodeRemaining() {
    setGeocoding(true)
    const { data: { session } } = await getSupabaseBrowser().auth.getSession()
    // One request per second server-side, so this comes back for the rest
    // rather than holding a serverless function open for a minute.
    for (let pass = 0; pass < 30; pass++) {
      const res = await fetch('/api/suppliers/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ batch: 5 }),
      })
      if (!res.ok) break
      const out = await res.json()
      if (!out.remaining) break
    }
    setGeocoding(false)
    void load()
  }

  const needle = query.trim().toLowerCase()
  const shown = (data?.branches ?? []).filter(b =>
    !needle ||
    `${b.supplier ?? ''} ${b.label} ${b.address} ${b.city ?? ''}`.toLowerCase().includes(needle)
  )

  return (
    <div className="space-y-3">
      {/* Where am I / search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search branch, city or street"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={locate}
          disabled={locating}
          className="min-h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 hover:border-blue-400 disabled:opacity-50"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
          {origin ? 'Nearest first' : 'Use my location'}
        </button>
      </div>

      {/* Category — preference order applies within the one you pick */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${
              category === c.key
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Showing the chains we buy {CATEGORIES.find(c => c.key === category)?.label.toLowerCase()} from,
          in our preferred order. Distance separates branches we are equally happy to use.
        </p>
      )}

      {locError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">{locError}</p>
      )}

      {isAdmin && !!data?.pendingGeocode && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-[11.5px] text-amber-800 dark:text-amber-200">
            {data.pendingGeocode} branches have no coordinates yet, so they cannot be sorted by distance.
          </span>
          <button
            onClick={geocodeRemaining}
            disabled={geocoding}
            className="flex-shrink-0 text-[11px] font-semibold underline disabled:opacity-50"
          >
            {geocoding ? 'Locating…' : 'Locate them'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin text-slate-400" />
        </div>
      ) : shown.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
          No branches match.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map(b => (
            <li
              key={b.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {b.supplier} &middot; {b.label}
                  </p>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {b.address}{b.city ? `, ${b.city}` : ''}
                  </p>
                  {b.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{b.notes}</p>
                  )}
                  {b.after_hours_phone && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> After hours{' '}
                      <a href={telHref(b.after_hours_phone)} className="underline">
                        {b.after_hours_phone}
                      </a>
                    </p>
                  )}
                </div>
                {b.km !== null && (
                  <span
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0"
                    title="Straight-line distance — tap Directions for the real drive"
                  >
                    ~{formatKm(b.km)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                {b.phone && (
                  <a
                    href={telHref(b.phone)}
                    className="min-h-9 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11.5px] font-medium flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200 hover:border-blue-400"
                  >
                    <Phone size={12} /> {b.phone}
                  </a>
                )}
                <a
                  href={directionsUrl(b)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-9 px-3 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/50 text-[11.5px] font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5"
                >
                  <Navigation size={12} /> Directions
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {origin && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Distances are straight-line and approximate. Directions open in Google Maps for the
          real route. Geocoding &copy; OpenStreetMap contributors.
        </p>
      )}
    </div>
  )
}
