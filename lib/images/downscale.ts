'use client'

// Phone cameras produce 3–5 MB JPEGs. That's a problem on two fronts:
//
//  1. Vercel caps a serverless function's request body at roughly 4.5 MB, so a
//     full-resolution photo straight off an iPhone lands close enough to the
//     ceiling that a slightly larger one fails outright.
//  2. Techs upload from supermarket plant rooms on poor cellular signal, where
//     a 4 MB upload is slow enough to look broken.
//
// Downscaling in the browser fixes both. 1920px on the long edge is more than
// enough to read a gauge, a nameplate or a burnt contactor in a report.

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82
/** Files at or below this are left alone — re-encoding them isn't worth it. */
const SKIP_BELOW_BYTES = 1024 * 1024

/**
 * Downscale and re-encode an image for upload.
 *
 * Best-effort by design: anything unexpected (a format the canvas can't decode,
 * a blocked canvas, a result that came out bigger) returns the original file so
 * the upload still goes ahead at full size rather than failing.
 */
export async function downscaleImage(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, maxDimension / longEdge)

    // Already small in both dimensions and bytes — nothing to gain.
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file

    const width  = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    // If re-encoding didn't actually help, keep the original.
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
