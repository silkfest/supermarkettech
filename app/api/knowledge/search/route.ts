import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { TOPICS } from '@/lib/knowledge/topics'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('documents')
    .select('title')
    .ilike('title', `%${q}%`)
    .eq('status', 'READY')
    .limit(100)

  if (!data?.length) return NextResponse.json([])

  const matchingSlugs = new Set<string>()
  for (const doc of data) {
    const lower = doc.title.toLowerCase()
    for (const topic of TOPICS) {
      if (topic.manualKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
        matchingSlugs.add(topic.slug)
      }
    }
  }

  return NextResponse.json(Array.from(matchingSlugs))
}
