import { createClient } from '@supabase/supabase-js';

export const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = !useMock && url && key ? createClient(url, key) : null;

export function requireSupabase() {
    if (!supabase) throw new Error('Thiếu cấu hình Supabase cho ứng dụng.');
    return supabase;
}
