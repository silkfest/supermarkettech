/** Links out to the phone's own apps.
 *
 *  Deliberately no Maps API key anywhere in this: Google's Maps URLs scheme is
 *  public, works the same on Android, iOS and desktop, and hands the whole job
 *  — real route, live traffic, turn-by-turn — to the Maps app the tech already
 *  has. Leaving `origin` out is what makes it start from where they are
 *  standing, which is the entire point and needs no permission prompt from us.
 */

const MAPS_DIR = 'https://www.google.com/maps/dir/?api=1'

export interface Addressable {
  address: string
  city?: string | null
  province?: string | null
}

/** The destination string: enough for Maps to resolve it unambiguously. */
export function destinationText(place: Addressable): string {
  return [place.address, place.city, place.province ?? 'ON', 'Canada']
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())
    .join(', ')
}

/** Driving directions from wherever the phone currently is.
 *
 *  Coordinates win over the address string when we have them — an address can
 *  be resolved to the wrong unit in a business park, a lat/lng cannot. */
export function directionsUrl(
  place: Addressable & { lat?: number | null; lng?: number | null }
): string {
  const dest =
    place.lat !== null && place.lat !== undefined &&
    place.lng !== null && place.lng !== undefined
      ? `${place.lat},${place.lng}`
      : destinationText(place)
  return `${MAPS_DIR}&destination=${encodeURIComponent(dest)}&travelmode=driving`
}

/** `tel:` href. Strips the spaces our list is written with; keeps a leading +. */
export function telHref(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d+]/g, '')
  return `tel:${cleaned}`
}

/* ------------------------------------------------------------------ *
 *  Geocoding addresses — a different job from showing them
 * ------------------------------------------------------------------ */

/** Address fragments naming a unit, suite or building rather than a place on
 *  the street.
 *
 *  This is the whole reason the first run stalled with 35 left. A geocoder
 *  resolves "655 Finley Ave, Ajax" and returns nothing at all for "655 Finley
 *  Ave, Unit 4, Ajax" — no map holds unit 4 as a point, and the extra token
 *  makes the parse fail rather than degrade. Every one of the 35 that would not
 *  place had a unit, suite or building number in it; every one that placed was
 *  a plain street address.
 *
 *  `\b` after the short keywords matters: without it `ste` matches inside
 *  "Steeles Ave" and throws away a real street. */
const UNIT_FRAGMENT =
  /^(?:units?|suites?|ste|bldg|buildings?|floors?|fl|dept)\b[\s.:#-]*[0-9a-z&\s.#/+-]*$|^#\s*[0-9a-z&.#/+-]+$/i

/** The address with unit/suite fragments removed, for lookup only.
 *
 *  Fragments are dropped wherever they sit, not just at the end — one of ours
 *  reads "Units 4-6, 27 Seapark Drive", unit first. What is shown to the tech
 *  keeps its unit number: they need it to find the counter. */
export function geocodableAddress(address: string): string {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !UNIT_FRAGMENT.test(part))
    .join(', ')
}

/** Free-form geocoder query: street and city, no unit. */
export function geocodeQuery(place: Addressable): string {
  return destinationText({ ...place, address: geocodableAddress(place.address) })
}

/** Structured query, tried when the free-form one finds nothing.
 *
 *  Nominatim treats these fields separately instead of guessing at a comma
 *  layout, which rescues addresses whose street name it would otherwise read as
 *  part of something else. */
export function structuredGeocodeParams(place: Addressable): Record<string, string> {
  const params: Record<string, string> = {
    street: geocodableAddress(place.address),
    country: 'Canada',
    state: place.province ?? 'ON',
  }
  if (place.city && place.city.trim()) params.city = place.city.trim()
  return params
}
