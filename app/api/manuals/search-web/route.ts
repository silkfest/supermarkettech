import { NextRequest, NextResponse } from 'next/server'

export interface WebManualResult {
  title: string
  url: string
  source: 'manualslib'
}

function decodeEntities(str: string) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

async function searchManualsLib(query: string): Promise<WebManualResult[]> {
  const url = `https://www.manualslib.com/search/?q=${encodeURIComponent(query)}&type=1`
  const res  = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []

  const html    = await res.text()
  const results: WebManualResult[] = []
  const seen    = new Set<string>()

  // ManualsLib result links look like href="/manual/12345/brand-model.html"
  const re = /href="(\/manual\/\d+\/[^"]+\.html)"[^>]*>([\s\S]{5,120}?)<\/a>/g
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) !== null && results.length < 8) {
    const path  = m[1]
    const raw   = m[2].replace(/<[^>]+>/g, '').trim()
    const title = decodeEntities(raw)
    if (!title || title.length < 5) continue
    const fullUrl = `https://www.manualslib.com${path}`
    if (seen.has(fullUrl)) continue
    seen.add(fullUrl)
    results.push({ title, url: fullUrl, source: 'manualslib' })
  }

  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const manufacturer = searchParams.get('manufacturer')?.trim() ?? ''
  const model        = searchParams.get('model')?.trim() ?? ''

  if (!model) return NextResponse.json([])

  const query = [manufacturer, model, 'manual'].filter(Boolean).join(' ')

  try {
    const results = await searchManualsLib(query)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[manual web-search]', err)
    return NextResponse.json([])
  }
}
