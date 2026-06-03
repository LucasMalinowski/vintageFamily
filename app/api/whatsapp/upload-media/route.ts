import { NextRequest, NextResponse } from 'next/server'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import sharp from 'sharp'

/**
 * GET /api/whatsapp/upload-media
 *
 * One-shot: fetches insights_whatsapp.png, compresses it to JPEG (≤1MB),
 * and uploads it to WhatsApp's Media API.
 * Set the returned media_id as WHATSAPP_INSIGHTS_IMAGE_ID in Vercel env vars.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const imageUrl = `${appUrl}/insights_whatsapp.png`

	  const imageRes = await fetch(imageUrl, { cache: 'no-store' })
  if (!imageRes.ok) {
    return NextResponse.json({ error: `Failed to fetch image: ${imageRes.status} ${imageUrl}` }, { status: 500 })
  }

  const rawBuffer = Buffer.from(await imageRes.arrayBuffer())

  // WhatsApp template header: max 5MB, recommended 800×418px JPEG
  const compressed = await sharp(rawBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()

  console.log(`[upload-media] original=${rawBuffer.length} compressed=${compressed.length}`)

  const mediaId = await whatsAppService.uploadMedia(compressed, 'image/jpeg')

  return NextResponse.json({
    media_id: mediaId,
    next_step: `Set WHATSAPP_INSIGHTS_IMAGE_ID=${mediaId} in your Vercel environment variables`,
  })
}
