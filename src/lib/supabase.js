import { createClient } from '@supabase/supabase-js'

// Credentials come from Vite env vars (see .env). The anon key is safe to ship
// to the browser — Row-Level Security in the database is what protects the data.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
