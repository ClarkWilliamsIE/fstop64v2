import { useState, useEffect } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import { UserProfile } from '../types';

export function useAuthSubscription() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper: Count exports for the current calendar month
  const getMonthlyExportCount = async (userId: string) => {
    if (isMockMode || !supabase) return 0;

    const now = new Date();
    // Get the first day of the current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count, error } = await supabase
      .from('export_logs')
      .select('*', { count: 'exact', head: true }) // head:true means don't fetch data, just count
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (error) {
      console.error("Error counting exports:", error);
      return 0;
    }
    return count || 0;
  };

  const fetchProfile = async (sessionUser: any) => {
    if (isMockMode) return;

    // 1. Fetch Pro Status from 'profiles' table
    const { data: profileData } = await supabase!
      .from('profiles')
      .select('is_pro')
      .eq('id', sessionUser.id)
      .single();

    // 2. Calculate Usage from 'export_logs' table
    const exportCount = await getMonthlyExportCount(sessionUser.id);

    // 3. Combine into our Frontend UserProfile object
    setProfile({
      id: sessionUser.id,
      email: sessionUser.email,
      is_pro: profileData?.is_pro || false, // Default to false if row missing
      export_count: exportCount
    });
  };

  useEffect(() => {
    if (isMockMode) {
      setLoading(false);
      return;
    }

    // Initial Session Check
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      setLoading(false);
    });

    // Real-time Auth Listener
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (isMockMode) {
      const mockUser = { id: 'mock-123', email: 'guest@example.com' };
      setUser(mockUser);
      setProfile({
        id: 'mock-123',
        email: 'guest@example.com',
        is_pro: false,
        export_count: 5
      });
      return;
    }
    
    // We'll use Google OAuth by default. 
    // Ensure you have Google enabled in Supabase Authentication -> Providers
    await supabase!.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin // Ensure they return to the app
      }
    });
  };

  const signOut = async () => {
    if (isMockMode) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase!.auth.signOut();
    setProfile(null);
  };

  // --- UPDATED: Connects to Vercel API for Stripe Checkout ---
  const upgradeToPro = async () => {
    if (isMockMode) {
       alert("Payment disabled in Mock Mode.");
       return;
    }
    
    if (!user) {
      alert("Please sign in to upgrade.");
      return;
    }

    try {
      // Call our new Vercel API endpoint
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: { id: user.id, email: user.email } }),
      });

      const data = await res.json();
      
      if (data.url) {
        // Redirect user to Stripe's hosted checkout page
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Failed to start checkout. Please try again.");
    }
  };

  const canExport = (): { allowed: boolean; reason?: 'auth' | 'quota' } => {
    if (!user) return { allowed: false, reason: 'auth' };
    if (profile?.is_pro) return { allowed: true };
    // Limit is 30
    if (profile && profile.export_count >= 30) return { allowed: false, reason: 'quota' };
    return { allowed: true };
  };

  const incrementExport = async () => {
    // 1. Optimistic UI update (makes the UI feel instant)
    if (profile && !profile.is_pro) {
      setProfile({ ...profile, export_count: profile.export_count + 1 });
    }

    // 2. Real Database Insert
    if (!isMockMode && user) {
      const { error } = await supabase!
        .from('export_logs')
        .insert({ user_id: user.id }); // RLS requires us to own this user_id
        
      if (error) console.error("Failed to log export:", error);
    }
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signOut,
    upgradeToPro,
    canExport,
    incrementExport
  };
}
