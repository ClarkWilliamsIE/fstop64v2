import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

/**
 * Submits user feedback to the database.
 * If in mock mode, it just logs to console.
 */
export const submitFeedback = async (content: string, email?: string) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("📝 [Mock Mode] Feedback Submitted:", { content, email });
    return { error: null };
  }
  
  try {
    // Get user from auth if they are signed in
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('feedback').insert([{ 
      content, 
      user_id: user?.id || null, 
      email: user?.email || email || 'anonymous' 
    }]);

    return { error };
  } catch (e) {
    console.error("Feedback submission error:", e);
    return { error: e };
  }
};
