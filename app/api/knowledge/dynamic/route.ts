import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET() {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('knowledge_topics')
    .select('id, slug, title, short_title, description, tags, icon_name, color_class, source, document_id, created_at')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}
