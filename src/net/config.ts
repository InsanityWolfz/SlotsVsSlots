/**
 * THE LEADERBOARDS' backend (Supabase). Both values are public by design (the anon key only allows what the row-level
 * security in supabase/schema.sql allows). Empty = offline: the game hides the online boards and submits nothing.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
export const online = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
