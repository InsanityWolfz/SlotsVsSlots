/**
 * THE LEADERBOARDS' backend (Supabase). Paste the project URL (https://<project id>.supabase.co) and the publishable key
 * (or a legacy anon key) here (Supabase dashboard > Project Settings > API), or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time. Both are public by design: the anon key only
 * allows what the row-level security in supabase/schema.sql allows. Empty = offline: no online boards, nothing posted.
 */
const URL_HERE = '';
const KEY_HERE = '';
export const SUPABASE_URL: string = URL_HERE || (import.meta.env?.VITE_SUPABASE_URL ?? '');
export const SUPABASE_ANON_KEY: string = KEY_HERE || (import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '');
export const online = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
