import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/billing/supabase-service'

interface Props {
  searchParams: { handoff?: string }
}

export default async function SubscribePage({ searchParams }: Props) {
  const handoff = searchParams.handoff

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

  // Set the app_access_token cookie — this is what getAccessTokenFromCookieStore reads
  const cookieStore = await cookies()
  cookieStore.set('app_access_token', encodeURIComponent(tokenRow.access_token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days — same as normal session
    path: '/',
  })

  redirect('/settings/billing')
}
