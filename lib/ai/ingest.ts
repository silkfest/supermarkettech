import { getSupabaseServer } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

export async function processDocumentBuffer(documentId: string, arrayBuf: ArrayBuffer) {
  const supabase = getSupabaseServer()
  try {
    const pdfParse = (await import('pdf-parse')).default
    const pageTexts: string[] = []
    const pdfData = await pdfParse(Buffer.from(arrayBuf), {
      // pdf-parse awaits pagerender at runtime; the @types/pdf-parse signature is wrong (sync-only)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pagerender: (async (pageData: any) => {
        try {
          const textContent = await pageData.getTextContent()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const text = textContent.items.map((item: any) => item.str ?? '').join(' ').trim()
          pageTexts.push(text)
          return text
        } catch {
          pageTexts.push('')
          return ''
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as unknown as (pageData: any) => string,
    })
    await ingestDocument(documentId, pageTexts.length > 0 ? pageTexts : [pdfData.text], pdfData.numpages)
  } catch (err) {
    console.error(`[Ingest failed] doc=${documentId}`, err)
    await supabase.from('documents').update({ status: 'FAILED' }).eq('id', documentId)
  }
}
