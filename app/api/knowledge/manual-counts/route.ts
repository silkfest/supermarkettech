import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'
import { TOPICS } from '@/lib/knowledge/topics'

// Batch version of /api/knowledge/[slug]/manuals that returns a manual count
// for every topic in a single query, instead of one ilike-OR query per topic
// (the knowledge page previously fired 50+ requests on mount).
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const supabase = getSupabaseServer()
  const { data } = await supabase.from('documents').select('id, title')
  const titles = (data ?? []).map(d => (d.title as string ?? '').toLowerCase())

  const counts: Record<string, number> = {}
  for (const topic of TOPICS) {
    if (topic.manualKeywords.length === 0) {
      counts[topic.slug] = 0
      continue
    }
    const keywords = topic.manualKeywords.map(kw => kw.toLowerCase())
    counts[topic.slug] = titles.filter(title => keywords.some(kw => title.includes(kw))).length
  }

  return NextResponse.json(counts)
}
