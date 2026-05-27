import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const rawName = searchParams.get('filename') ?? 'upload.pdf'
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${Date.now()}-${safeName}`

  const supabase = getSupabaseServer()
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUploadUrl(storagePath)

  if (error || !data) {
    console.error('[upload-url] createSignedUploadUrl failed', error)
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  return NextResponse.json({ uploadUrl: data.signedUrl, storagePath })
}
