import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env belum diset. Salin .env.example menjadi .env lalu isi kredensial Supabase.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
