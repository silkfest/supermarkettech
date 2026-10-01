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
