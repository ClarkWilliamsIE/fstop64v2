
import { useState, useEffect } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import { UserProfile } from '../types';

export function useAuthSubscription() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Auth & Profile Fetch
  useEffect(() => {
    if (isMockMode) {
      setLoading(false);
      return;
    }

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase!.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    };

    supabase!.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (isMockMode) {
      // Simulate Login
      const mockUserData = { id: 'mock-123', email: 'guest@example.com' };
      setUser(mockUserData);
      setProfile({
        id: 'mock-123',
        email: 'guest@example.com',
        is_pro: false,
        export_count: 5,
        quota_reset_date: new Date().toISOString()
      });
      return;
    }
    // Real Supabase Auth (OAuth/Email)
    await supabase!.auth.signInWithOAuth({ provider: 'google' });
  };

  const signOut = async () => {
    if (isMockMode) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase!.auth.signOut();
  };

  const upgradeToPro = async () => {
    console.log("Mock: Redirecting to Stripe Checkout...");
    // In production, you would call a Supabase Edge Function to create a Stripe session
    return new Promise((resolve) => {
      setTimeout(() => {
        setProfile(prev => prev ? { ...prev, is_pro: true } : null);
        alert("Payment Successful! Welcome to f/stop 64 Pro.");
        resolve(true);
      }, 1000);
    });
  };

  const canExport = (): { allowed: boolean; reason?: 'auth' | 'quota' } => {
    if (!user) return { allowed: false, reason: 'auth' };
    if (profile?.is_pro) return { allowed: true };
    if (profile && profile.export_count >= 30) return { allowed: false, reason: 'quota' };
    return { allowed: true };
  };

  const incrementExport = async () => {
    if (!profile || profile.is_pro) return;
    
    const newCount = profile.export_count + 1;
    setProfile({ ...profile, export_count: newCount });

    if (!isMockMode) {
      await supabase!
        .from('profiles')
        .update({ export_count: newCount })
        .eq('id', user.id);
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
