import { NextRequest, NextResponse } from 'next/server'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'

/**
 * GET /api/whatsapp/upload-media
 *
 * One-shot: fetches insights_whatsapp.png from the public URL and uploads it to
 * WhatsApp's Media API. Set the returned media_id as WHATSAPP_INSIGHTS_IMAGE_ID
 * in your environment variables — then you can delete this endpoint.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const imageUrl = `${appUrl}/insights_whatsapp.png`

  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) {
    return NextResponse.json({ error: `Failed to fetch image: ${imageRes.status} ${imageUrl}` }, { status: 500 })
  }

  const arrayBuffer = await imageRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mediaId = await whatsAppService.uploadMedia(buffer, 'image/png')

  return NextResponse.json({
    media_id: mediaId,
    next_step: `Set WHATSAPP_INSIGHTS_IMAGE_ID=${mediaId} in your environment variables`,
  })
}
