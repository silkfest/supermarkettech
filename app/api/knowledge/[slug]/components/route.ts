import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { getTopicBySlug } from '@/lib/knowledge/topics'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const topic = getTopicBySlug(slug)
  if (!topic) return NextResponse.json([])

  const supabase = getSupabaseServer()

  if (topic.manualKeywords.length === 0) return NextResponse.json([])

  // Match the topic's manual keywords against catalog manufacturer/model
  const conditions = topic.manualKeywords
    .flatMap(kw => [`manufacturer.ilike.%${kw}%`, `model.ilike.%${kw}%`])
    .join(',')

  const { data } = await supabase
    .from('manual_components')
    .select('id, type, manufacturer, model, store_name')
    .or(conditions)
    .order('manufacturer')
    .limit(20)

  return NextResponse.json(data ?? [])
}
