# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **Next.js 14 (App Router)** app for **Sidekick**, a swim-team platform. Package manager is **npm** (`package-lock.json`). There is **no automated test suite**.

Standard commands (see `package.json`): `npm run dev` (http://localhost:3000), `npm run build`, `npm start`, `npm run lint`, `npm run typegen`.

Non-obvious notes for running/developing here:

- **Supabase is required to boot.** `src/supabase/client.ts` throws if `NEXT_PUBLIC_SUPABASE_API_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. A live hosted Supabase project (anon key) is already committed in `.env`, so `npm run dev` works out of the box — no local database is run.
- **Product surfaces:** `/` `/company` `/pricing` (static marketing); `/review` (Supabase-backed "year in review" carousel, e.g. `/review?type=individual&user=<slug>`); `/admin/*` (staff console, Supabase auth + RLS, `coach`/`admin` roles); `/studio` (embedded Sanity Studio).
- **Admin requires a Supabase staff account.** `/login` uses password login for `@sidekick.com` / `@sidekickswim.com` emails and email OTP for everyone else; only `coach`/`admin` profiles can enter `/admin`. There is no seeded local account, so testing admin pages end-to-end needs real staff credentials.
- **`/studio` (Sanity) needs a hosted Sanity project.** `src/sanity/env.ts` throws client-side without `NEXT_PUBLIC_SANITY_PROJECT_ID`; set it (and `NEXT_PUBLIC_SANITY_DATASET`) via `.env.local` to use the blog Studio. Marketing/admin/review do not import Sanity and run without it.
- **PostHog / Resend / Google Analytics are optional** and the app degrades gracefully when their env vars are unset (see `.env.example`).
- **Lint config:** `.eslintrc.json` extends `next/core-web-vitals`. `npm run lint` reports mostly `<img>` warnings plus one pre-existing `react/no-children-prop` error in `src/app/review/page.tsx` (unrelated to environment setup).
