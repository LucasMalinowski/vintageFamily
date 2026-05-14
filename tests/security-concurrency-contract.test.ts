import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mobileRoot = resolve(repoRoot, '../florim-mobile')

function readFromWeb(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

function readFromMobile(path: string) {
  return readFileSync(resolve(mobileRoot, path), 'utf8')
}

describe('security concurrency contract', () => {
  const additiveMigration = readFromWeb('supabase/migrations/20260513120000_security_contract_additive.sql')

  it('consumes web handoff tokens atomically', () => {
    expect(additiveMigration).toContain('UPDATE public.web_handoff_tokens w')
    expect(additiveMigration).toContain('w.used = false')
    expect(additiveMigration).toContain('w.expires_at > now()')
    expect(additiveMigration).toContain('RETURNING w.id, w.user_id')
  })

  it('increments free-tier usage counters with a conditional update', () => {
    for (const counter of ['whatsapp_recordings', 'ai_queries', 'export_import_count', 'on_demand_insights', 'audio_messages']) {
      expect(additiveMigration).toContain(`WHERE family_id = p_family_id AND period = p_period AND ${counter} < p_limit`)
      expect(additiveMigration).toContain(`RETURNING ${counter} INTO v_value`)
    }
  })

  it('enforces invite, import, job and last-admin concurrency constraints in SQL', () => {
    expect(additiveMigration).toContain('invites_pending_family_email_unique_idx')
    expect(additiveMigration).toContain('bank_statement_import_batches_family_file_hash_unique_idx')
    expect(additiveMigration).toContain('PRIMARY KEY (family_id, job_type, period)')
    expect(additiveMigration).toContain('pg_advisory_xact_lock')
    expect(additiveMigration).toContain('cannot_demote_last_admin')
    expect(additiveMigration).toContain('cannot_remove_last_admin')
  })

  it('keeps Stripe subscription state idempotent and monotonic by event creation time', () => {
    expect(additiveMigration).toContain('CREATE OR REPLACE FUNCTION public.upsert_subscription_from_stripe')
    expect(additiveMigration).toContain('ON CONFLICT (family_id) DO UPDATE')
    expect(additiveMigration).toContain('public.subscriptions.last_stripe_event_created <= EXCLUDED.last_stripe_event_created')

    const webhook = readFromWeb('app/api/billing/webhooks/stripe/route.ts')
    expect(webhook).toContain('billing_events')
    expect(webhook).toContain('stripe_event_id')
    expect(webhook).toContain('upsert_subscription_from_stripe')
  })

  it('routes financial attachment uploads through the backend with server-generated non-upsert paths', () => {
    const uploadRoute = readFromWeb('app/api/attachments/upload/route.ts')
    expect(uploadRoute).toContain('crypto.randomUUID()')
    expect(uploadRoute).toContain("upsert: false")
    expect(uploadRoute).toContain("attachment_path: filePath")

    for (const path of [
      'components/pages/Expenses.tsx',
      'components/pages/Incomes.tsx',
      '../florim-mobile/app/(app)/expenses/index.tsx',
      '../florim-mobile/app/(app)/incomes/index.tsx',
    ]) {
      const source = path.startsWith('../florim-mobile/')
        ? readFileSync(resolve(repoRoot, path), 'utf8')
        : readFromWeb(path)
      expect(source).not.toMatch(/storage\.from\('attachments'\)[\s\S]*\.upload/)
      expect(source).not.toContain("'x-upsert': 'true'")
      expect(source).not.toContain('uploadAsync(')
      expect(source).toContain('/api/attachments/upload')
    }
  })

  it('keeps mobile auth session in SecureStore instead of AsyncStorage', () => {
    const supabaseClient = readFromMobile('lib/supabase.ts')
    expect(supabaseClient).toContain('expo-secure-store')
    expect(supabaseClient).toContain('WHEN_UNLOCKED_THIS_DEVICE_ONLY')
    expect(supabaseClient).not.toContain('@react-native-async-storage/async-storage')
  })
})
