import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { slug } = await params
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('knowledge_topics')
    .select('id, slug, title, short_title, description, content, tags, icon_name, color_class, source, document_id')
    .eq('slug', slug)
    .single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
