# Purus CRM

A lightweight, single-user outreach CRM for tracking influencer, affiliate, and press contacts for the Purus iOS app.

## Stack
- React + Vite
- Tailwind CSS
- Zustand (state)
- Supabase (auth + Postgres data)
- React Router
- Netlify (deploy)

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

## Deploy (Netlify)
- Connect this repo in Netlify, or run `netlify deploy`.
- Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`).
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
