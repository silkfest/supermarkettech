import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer()

  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  const catalogId = formData.get('catalogId') as string | null

  if (!file || !catalogId) {
    return NextResponse.json({ error: 'file and catalogId are required' }, { status: 400 })
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${catalogId}/${Date.now()}.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await supabase.storage
    .from('component-photos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[components/upload] upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('component-photos')
    .getPublicUrl(path)

  // Persist the URL back to manual_components
  const { error: updateError } = await supabase
    .from('manual_components')
    .update({ photo_url: publicUrl })
    .eq('id', catalogId)

  if (updateError) {
    console.error('[components/upload] db update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
