# fintech-vintage

Next.js website **and** Supabase backend/migrations for the florim app. The **companion repo** is:

| Repo | Path | Purpose |
|------|------|---------|
| Mobile (Expo) | `/home/lucas/Documentos/ruby/florim-mobile` | React Native app |

> There is also `/home/lucas/vintageFamily` on this machine — that is a different/older project. Do not edit it for florim features.

## Key paths in this repo

- `components/pages/Expenses.tsx` — Expenses page (list + RightDrawer create/edit form)
- `components/pages/Incomes.tsx` — Incomes page
- `components/pages/Dashboard.tsx` — Home dashboard
- `components/categories/CategorySettingsModal.tsx` — Category create/edit modal
- `supabase/migrations/` — All DB migrations (apply via `supabase db push` or paste in Supabase SQL editor)

## Supabase

Shared with mobile. Tables: `expenses`, `incomes`, `categories`, `recurring_patterns`.
