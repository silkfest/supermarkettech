import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'
import { getTopicBySlug } from '@/lib/knowledge/topics'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const topic = getTopicBySlug(slug)
  if (!topic) return NextResponse.json([])

  const supabase = getSupabaseServer()

  const { data } = await supabase
    .from('doc_images')
    .select('id, page_number, caption, description, storage_path, document_id')
    .eq('topic_slug', slug)
    .order('page_number', { ascending: true })

  if (!data?.length) return NextResponse.json([])

  // Get public URLs for each image
  const figures = data.map(row => {
    const { data: urlData } = supabase.storage
      .from('diagram-images')
      .getPublicUrl(row.storage_path)
    return {
      id:          row.id,
      page_number: row.page_number,
      caption:     row.caption,
      description: row.description,
      document_id: row.document_id,
      url:         urlData.publicUrl,
    }
  })

  return NextResponse.json(figures)
}
