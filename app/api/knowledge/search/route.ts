import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { discoveryResources } from '@/lib/knowledge/discovery'
import { searchResources } from '@/lib/knowledge/search'
export type { ContentMatch } from '@/lib/knowledge/search'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 200) ?? ''
  if (q.length < 2) return NextResponse.json({ results: [], docSlugs: [], contentMatches: [], unavailable: [] })
  const { resources, unavailable } = await discoveryResources(auth.id)
  const matches = searchResources(resources, q)
  // Keep compatibility with topic browsing while the shared search handles all resource types.
  const contentMatches = matches.filter(r => r.topicSlug).map(r => ({
    topicSlug: r.topicSlug, topicTitle: r.title.split(' · ')[0], sectionTitle: r.sectionTitle ?? 'Overview',
    sectionId: r.href.split('#')[1] ?? '', excerpt: r.excerpt,
  }))
  // Full article bodies stay server-side; the phone receives concise result cards.
  const results = matches.map(match => { const result = { ...match }; delete result.content; delete result.keywords; return result })
  return NextResponse.json({ results, docSlugs: [], contentMatches, unavailable }, { headers: { 'Cache-Control': 'private, no-store' } })
}
