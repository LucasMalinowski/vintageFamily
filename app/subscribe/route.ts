import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'
import { buildAuthHandoffUrl, getMagicLinkTokenHash } from '@/lib/billing/web-handoff'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const handoff = request.nextUrl.searchParams.get('handoff')

  if (!handoff) {
    redirect('/login?error=convite-invalido')
  }

  const { data: tokenRow, error } = await supabaseService
    .from('web_handoff_tokens')
    .select('id, user_id, access_token, used, expires_at')
    .eq('token', handoff)
    .maybeSingle()

  if (error || !tokenRow) {
    redirect('/login?error=link-invalido')
  }

  if (tokenRow.used) {
    redirect('/login?error=link-ja-usado')
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    redirect('/login?error=link-expirado')
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

  const { error: markError } = await supabaseService
    .from('web_handoff_tokens')
    .update({ used: true })
    .eq('id', tokenRow.id)

  if (markError) {
    console.error('web-handoff mark used failed', markError)
    redirect('/login?error=link-invalido')
  }

  return NextResponse.redirect(buildAuthHandoffUrl(siteUrl, tokenHash))
}
