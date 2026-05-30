import { NextRequest, NextResponse } from 'next/server'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * GET /api/whatsapp/upload-media
 *
 * One-shot: uploads insights_whatsapp.png from the public folder to WhatsApp's
 * Media API and returns the media_id. Set the returned id as
 * WHATSAPP_INSIGHTS_IMAGE_ID in your environment variables — then delete this endpoint.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const imagePath = path.join(process.cwd(), 'public', 'insights_whatsapp.png')
  const buffer = await readFile(imagePath)
  const mediaId = await whatsAppService.uploadMedia(buffer, 'image/png')

  return NextResponse.json({
    media_id: mediaId,
    next_step: `Set WHATSAPP_INSIGHTS_IMAGE_ID=${mediaId} in your environment variables`,
  })
}
