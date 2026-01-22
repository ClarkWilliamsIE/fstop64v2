
import { createClient } from '@supabase/supabase-js';

// These should be set in your GitHub Actions Secrets or .env file
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// If keys are missing, the app will run in "Mock Mode"
export const isMockMode = !supabaseUrl || !supabaseAnonKey;

export const supabase = isMockMode ? null : createClient(supabaseUrl, supabaseAnonKey);
