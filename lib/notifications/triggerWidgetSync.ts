import { supabase } from '@/lib/supabase'

/**
 * Fire-and-forget: tells the backend to push a silent "widget update"
 * notification to every device in the current user's family, so the
 * Florim mobile widgets refresh without opening the app.
 *
 * Call this after any successful mutation to expenses, incomes,
 * reminders, savings/dreams or category limits.
 */
export function triggerWidgetSync(): void {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return
    fetch('/api/widgets/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {/* silent */})
  })
}
