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

    // 1. Fetch Pro Status AND Customer ID from 'profiles' table
    const { data: profileData } = await supabase!
      .from('profiles')
      .select('is_pro, stripe_customer_id') // <--- UPDATED to fetch ID
      .eq('id', sessionUser.id)
      .single();

    // 2. Calculate Usage from 'export_logs' table
    const exportCount = await getMonthlyExportCount(sessionUser.id);

    // 3. Combine into our Frontend UserProfile object
    setProfile({
      id: sessionUser.id,
      email: sessionUser.email,
      is_pro: profileData?.is_pro || false,
      stripe_customer_id: profileData?.stripe_customer_id, // <--- STORE IT
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
    
    await supabase!.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
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

  // --- UPGRADE TO PRO (With Robust Error Handling) ---
  const upgradeToPro = async () => {
    if (isMockMode || !user) {
      alert("Please sign in to upgrade.");
      return;
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { id: user.id, email: user.email } }),
      });

      // 1. Try to parse JSON
      let data;
      try {
        data = await res.json();
      } catch (e) {
        // If it's not JSON, it's likely a crash (HTML response)
        const text = await res.text();
        throw new Error(`Server Crash: ${text.substring(0, 100)}...`);
      }

      // 2. Check for explicit Server Error
      if (!res.ok || data.error) {
        throw new Error(data.error || "Unknown Server Error");
      }
      
      // 3. Success
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout failed:", error);
      alert(`Checkout Failed: ${error.message}`);
    }
  };

  // --- NEW: MANAGE SUBSCRIPTION (Cancel/Update) ---
  const manageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      alert("Cannot find subscription. Are you sure you are Pro?");
      return;
    }

    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to load portal: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error loading portal.");
    }
  };

  const canExport = (): { allowed: boolean; reason?: 'auth' | 'quota' } => {
    if (!user) return { allowed: false, reason: 'auth' };
    if (profile?.is_pro) return { allowed: true };
    if (profile && profile.export_count >= 30) return { allowed: false, reason: 'quota' };
    return { allowed: true };
  };

  const incrementExport = async () => {
    if (profile && !profile.is_pro) {
      setProfile({ ...profile, export_count: profile.export_count + 1 });
    }

    if (!isMockMode && user) {
      const { error } = await supabase!
        .from('export_logs')
        .insert({ user_id: user.id });
        
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
    manageSubscription, // <--- EXPORTED HERE
    canExport,
    incrementExport
  };
}
