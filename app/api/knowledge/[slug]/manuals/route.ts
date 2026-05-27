import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { getTopicBySlug } from '@/lib/knowledge/topics'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const topic = getTopicBySlug(slug)
  if (!topic) return NextResponse.json([])

  const supabase = getSupabaseServer()

  if (topic.manualKeywords.length === 0) return NextResponse.json([])

  // Build OR conditions for each keyword
  const conditions = topic.manualKeywords
    .map(kw => `title.ilike.%${kw}%`)
    .join(',')

  const { data } = await supabase
    .from('documents')
    .select('id, title, created_at')
    .or(conditions)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
