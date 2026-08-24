# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **Next.js 14 (App Router)** app for **Sidekick**, a swim-team platform. Package manager is **npm** (`package-lock.json`). There is **no automated test suite**.

Standard commands (see `package.json`): `npm run dev` (http://localhost:3000), `npm run build`, `npm start`, `npm run lint`, `npm run typegen`.

Non-obvious notes for running/developing here:

- **Supabase is required to boot.** `src/supabase/client.ts` throws if `NEXT_PUBLIC_SUPABASE_API_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. A live hosted Supabase project (anon key) is already committed in `.env`, so `npm run dev` works out of the box — no local database is run.
- **Product surfaces:** `/` `/company` `/pricing` (static marketing); `/review` (Supabase-backed "year in review" carousel, e.g. `/review?type=individual&user=<slug>`); `/admin/*` (staff console, Supabase auth + RLS, `coach`/`admin` roles); `/studio` (embedded Sanity Studio).
- **Admin requires a Supabase staff account.** `/login` uses password login for `@sidekick.com` / `@sidekickswim.com` emails and email OTP for everyone else; only `coach`/`admin` profiles can enter `/admin`. There is no seeded local account, so testing admin pages against live data needs real staff credentials.
- **Admin UI demo mode (local and Vercel Preview).** Set `ADMIN_DEMO_SECRET` (Preview/Development only — never Production). Open `/api/admin/demo-login?secret=<ADMIN_DEMO_SECRET>` to set an httpOnly cookie and land on `/admin` as a fixture staff user. Tables (`profile`, `team`, `email_tracking`, `workout_log`) are in-memory fixtures; member edits and email sends are no-ops. Demo mode is refused when `VERCEL_ENV=production`, even if the secret is present. Local `.env` includes `ADMIN_DEMO_SECRET=sidekick-admin-demo-local`. On Vercel Preview, set a dedicated secret in the Preview environment and, if Deployment Protection is on, also pass Vercel’s bypass header/token so the agent can reach the URL.
- **`/studio` (Sanity) needs a hosted Sanity project.** `src/sanity/env.ts` throws client-side without `NEXT_PUBLIC_SANITY_PROJECT_ID`; set it (and `NEXT_PUBLIC_SANITY_DATASET`) via `.env.local` to use the blog Studio. Marketing/admin/review do not import Sanity and run without it.
- **PostHog / Resend / Google Analytics are optional** and the app degrades gracefully when their env vars are unset (see `.env.example`).
- **Monthly review cron:** Vercel Cron hits `/api/cron/monthly-review` on the 1st of each month at 15:00 UTC (`vercel.json`). It emails all members for the previous calendar month via Resend. Requires Production env vars `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (plus `RESEND_API_KEY`). Dedupes via `email_campaign_send` (unique `campaign` + `period`); apply `supabase/migrations/20260824_email_campaign_send.sql` in Supabase before enabling cron. Manual sends remain available under Admin → Emails → Monthly review.
- **Lint config:** `.eslintrc.json` extends `next/core-web-vitals`. `npm run lint` reports mostly `<img>` warnings plus one pre-existing `react/no-children-prop` error in `src/app/review/page.tsx` (unrelated to environment setup).
