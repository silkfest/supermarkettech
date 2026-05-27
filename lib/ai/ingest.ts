import { getSupabaseServer } from '@/lib/supabase/client'
import { ingestDocument } from '@/lib/ai/rag'

export async function processDocumentByPath(documentId: string, storagePath: string) {
  const supabase = getSupabaseServer()
  const { data: blob, error } = await supabase.storage.from('documents').download(storagePath)
  if (error || !blob) {
    console.error(`[Ingest] failed to download doc=${documentId} path=${storagePath}`, error)
    await supabase.from('documents').update({ status: 'FAILED' }).eq('id', documentId)
    return
  }
  const arrayBuf = await blob.arrayBuffer()
  await processDocumentBuffer(documentId, arrayBuf)
}

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

    let texts = pageTexts.length > 0 ? pageTexts : [pdfData.text]

    // If pdf-parse extracted very little text the PDF is likely scanned — try Jina OCR
    const totalChars = texts.join('').trim().length
    if (totalChars < 150 && process.env.JINA_API_KEY) {
      console.log(`[Ingest] doc=${documentId} sparse text (${totalChars} chars), trying Jina OCR`)
      const ocrText = await jinaOcrDocument(documentId)
      if (ocrText && ocrText.trim().length > totalChars) {
        texts = [ocrText]
      }
    }

    await ingestDocument(documentId, texts, pdfData.numpages)
  } catch (err) {
    console.error(`[Ingest failed] doc=${documentId}`, err)
    await supabase.from('documents').update({ status: 'FAILED' }).eq('id', documentId)
  }
}

async function jinaOcrDocument(documentId: string): Promise<string | null> {
  const supabase = getSupabaseServer()
  try {
    const { data: doc } = await supabase
      .from('documents')
      .select('file_name')
      .eq('id', documentId)
      .single()

    if (!doc?.file_name) return null

    const { data: signed } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_name, 300)

    if (!signed?.signedUrl) return null

    const res = await fetch(`https://r.jina.ai/${signed.signedUrl}`, {
      headers: {
        'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
    })

    if (!res.ok) {
      console.warn(`[Jina OCR] doc=${documentId} status=${res.status}`)
      return null
    }

    const text = await res.text()
    console.log(`[Jina OCR] doc=${documentId} extracted ${text.length} chars`)
    return text
  } catch (err) {
    console.warn(`[Jina OCR] doc=${documentId} error`, err)
    return null
  }
}
