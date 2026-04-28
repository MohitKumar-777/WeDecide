import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseKey     = process.env.SUPABASE_SERVICE_KEY ?? 'placeholder_key';

export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export type DB = typeof db;
