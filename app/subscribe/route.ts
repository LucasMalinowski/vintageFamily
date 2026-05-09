import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'

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

  // Mark as used immediately (single-use)
  await supabaseService
    .from('web_handoff_tokens')
    .update({ used: true })
    .eq('id', tokenRow.id)

  // Get the user's email so we can generate a magic link
  const { data: adminUser } = await supabaseService.auth.admin.getUserById(tokenRow.user_id)
  const email = adminUser?.user?.email

  if (!email) {
    redirect('/login?error=link-invalido')
  }

  const siteUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const redirectTo = `${siteUrl}/auth/handoff`

  // supabase-js admin.generateLink ignores `redirectTo` due to a camelCase/snake_case mismatch;
  // calling the REST API directly ensures redirect_to is respected.
  const generateRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ type: 'magiclink', email, redirect_to: redirectTo }),
    }
  )

  if (!generateRes.ok) {
    console.error('web-handoff generateLink failed', await generateRes.text())
    redirect('/login?error=link-invalido')
  }

  const linkData = await generateRes.json()
  const actionLink: string | undefined = linkData?.action_link

  if (!actionLink) {
    redirect('/login?error=link-invalido')
  }

  return NextResponse.redirect(actionLink)
}
