import { supabase } from '@/lib/supabase'

export async function getAuthBearerToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    return null
  }

  return data.session.access_token
}
