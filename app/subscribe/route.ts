import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'
import { buildAuthHandoffUrl, getMagicLinkTokenHash } from '@/lib/billing/web-handoff'
import { sha256Hex } from '@/lib/security/tokens'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const handoff = request.nextUrl.searchParams.get('handoff')

  if (!handoff) {
    redirect('/login?error=convite-invalido')
  }

  const { data: consumedRows, error } = await supabaseService.rpc('consume_web_handoff_token', {
    p_token_hash: sha256Hex(handoff),
  })
  const tokenRow = Array.isArray(consumedRows) ? consumedRows[0] : null

  if (error || !tokenRow) {
    redirect('/login?error=link-invalido')
  }

  const siteUrl = request.nextUrl.origin
  const { data: adminUser } = await supabaseService.auth.admin.getUserById(tokenRow.user_id)
  const email = adminUser?.user?.email

  if (!email) {
    redirect('/login?error=link-invalido')
  }

  const { data: linkData, error: linkError } = await supabaseService.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/handoff`,
    },
  })

  const tokenHash = getMagicLinkTokenHash(linkData)

  if (linkError || !tokenHash) {
    console.error('web-handoff generateLink failed', linkError)
    redirect('/login?error=link-invalido')
  }

  return NextResponse.redirect(buildAuthHandoffUrl(siteUrl, tokenHash))
}
