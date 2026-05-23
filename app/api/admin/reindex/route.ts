import { NextRequest } from 'next/server'
import { getSupabaseRouteAuth, getSupabaseServer } from '@/lib/supabase/client'
import { processDocumentBuffer } from '@/app/api/documents/route'

// Allow up to 5 minutes for re-ingesting many documents
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_name, title')
    .not('file_name', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!docs?.length) return Response.json({ message: 'No documents found', results: [] })

  const results: Array<{ id: string; title: string; status: string; error?: string }> = []

  for (const doc of docs) {
    try {
      // Download PDF from storage
      const { data: signed } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_name, 120)

      if (!signed?.signedUrl) throw new Error('Could not generate signed URL')

      const pdfRes = await fetch(signed.signedUrl)
      if (!pdfRes.ok) throw new Error(`Failed to fetch PDF: ${pdfRes.status}`)
      const arrayBuf = await pdfRes.arrayBuffer()

      // Delete old chunks so we don't accumulate duplicates
      await supabase.from('doc_chunks').delete().eq('document_id', doc.id)

      // Mark as processing then re-ingest
      await supabase.from('documents').update({ status: 'PROCESSING' }).eq('id', doc.id)
      await processDocumentBuffer(doc.id, arrayBuf)

      results.push({ id: doc.id, title: doc.title, status: 'ok' })
      console.log(`[Reindex] ok doc=${doc.id} title=${doc.title}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ id: doc.id, title: doc.title, status: 'error', error: msg })
      console.error(`[Reindex] failed doc=${doc.id}`, msg)
    }
  }

  return Response.json({ total: docs.length, results })
}
