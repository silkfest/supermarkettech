// Fetch a PDF from an external URL for ingestion. Handles the messy reality of
// manufacturer sites: redirects, HTML landing pages that link to the real PDF,
// and oversized files. SSRF-guarded — refuses private/loopback hosts.

const MAX_PDF_BYTES = 50 * 1024 * 1024

export function isPrivateUrl(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr)
    if (protocol !== 'http:' && protocol !== 'https:') return true
    if (hostname === 'localhost' || hostname === '0.0.0.0') return true
    const parts = hostname.split('.').map(Number)
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    return false
  } catch { return true }
}

export type FetchPdfResult =
  | { ok: true; buffer: ArrayBuffer; finalUrl: string }
  | { ok: false; error: string }

export async function fetchPdfFromUrl(url: string, depth = 0): Promise<FetchPdfResult> {
  if (depth > 2) return { ok: false, error: 'Could not locate a PDF at this URL' }
  if (isPrivateUrl(url)) return { ok: false, error: 'URL not allowed' }

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ColdIQ-manual-importer/1.0)',
        'Accept': 'application/pdf,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45_000),
    })
  } catch (err) {
    const msg = err instanceof Error && err.name === 'TimeoutError' ? 'Timed out fetching the URL' : 'Could not reach the URL'
    return { ok: false, error: msg }
  }

  if (!res.ok) return { ok: false, error: `URL returned ${res.status}` }

  const contentType = (res.headers.get('content-type') ?? '').toLowerCase()

  if (!contentType.includes('pdf')) {
    // Not a PDF — scan the HTML for a PDF link and recurse once
    const html = await res.text()
    const pdfMatch = html.match(/href="([^"]+\.pdf[^"]*)"/i)
    if (pdfMatch) {
      const found = pdfMatch[1]
      const absolute = found.startsWith('http') ? found : new URL(found, res.url || url).href
      return fetchPdfFromUrl(absolute, depth + 1)
    }
    return { ok: false, error: 'URL does not point to a PDF (and no PDF link found on the page)' }
  }

  const buffer = await res.arrayBuffer()
  if (buffer.byteLength > MAX_PDF_BYTES) return { ok: false, error: 'PDF is too large (max 50 MB)' }
  if (buffer.byteLength < 1024) return { ok: false, error: 'Downloaded file is too small to be a manual' }

  return { ok: true, buffer, finalUrl: res.url || url }
}
