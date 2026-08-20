# Purus CRM

A lightweight, single-user outreach CRM for tracking influencer, affiliate, and press contacts for the Purus iOS app.

## Stack
- React + Vite
- Tailwind CSS
- Zustand (state)
- Supabase (auth + Postgres data)
- React Router
- Apify (Find Leads creator search, via serverless functions)
- Vercel (deploy)

## Setup

### 1. Create the database
1. In your Supabase project, go to **SQL Editor → New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   - Creates the `contacts` table, an `updated_at` trigger, and Row-Level Security scoped to authenticated sessions.

### 2. Create your account
This is single-user, so there's no team invite flow. Easiest path:
- Supabase → **Authentication → Users → Add user** — set your email/password and mark it confirmed.
- Or use the "Sign up" link on the app's login screen, then confirm via the email Supabase sends. For instant access during setup you can temporarily turn off **Confirm email** under Authentication → Providers → Email.

### 3. Connect the app
1. Supabase → **Project Settings → API** → copy the **Project URL** and **anon/public** key.
2. Copy `.env.example` to `.env` and fill them in.
3. `npm install && npm run dev`.

### 4. Find Leads (Apify) — optional
The Board, List, and modal all work without this. Find Leads needs an Apify account:
1. Get an API token from the [Apify Console](https://console.apify.com/) → **Settings → Integrations**.
2. Add it to `.env` as `APIFY_API_TOKEN` (no `VITE_` prefix — it's read server-side only, by `/api/apify/*`, and is never bundled into the browser code).
3. `npm run dev` proxies those routes locally too (see `vite.config.js`), so no separate process is needed.

Search results are capped at ~30 per platform to keep runs fast and cheap. Instagram's hashtag scraper returns post data, not profile stats, so follower count is left blank for Instagram leads — TikTok and YouTube results do include it.

## Deploy (Vercel)
- Import this repo at [vercel.com/new](https://vercel.com/new) — it auto-detects Vite (build command `npm run build`, output `dist`; SPA fallback already set in `vercel.json`).
- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and (if using Find Leads) `APIFY_API_TOKEN` under Project Settings → Environment Variables, then redeploy — Vite bakes env vars in at build time, so a plain "add var" isn't enough on its own.
- The `/api/apify/*` functions in `api/` are picked up automatically as Vercel serverless functions.

## Deploy (Netlify)
- Netlify also works for Board/List/modal (`netlify.toml` is set up the same way), but **Find Leads is Vercel-only right now** — the Apify proxy is implemented as Vercel serverless functions (`api/`), and there's no Netlify Functions equivalent yet. Add one under `netlify/functions/` if you want Find Leads to work there too.
