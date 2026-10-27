import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase = url && key ? createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
}) : null
