import { useState, useEffect } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import { Preset, EditParams } from '../types';

export function usePresets(userId: string | null) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);

  // Load presets when user logs in
  useEffect(() => {
    if (!userId || isMockMode) {
      setPresets([]); // Clear presets on logout
      return;
    }

    const fetchPresets = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from('presets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching presets:', error);
      } else {
        // Map DB shape to App shape if needed (jsonb handles structure automatically)
        setPresets(data as Preset[]); 
      }
      setLoading(false);
    };

    fetchPresets();
  }, [userId]);

  const savePreset = async (name: string, params: EditParams) => {
    if (isMockMode) {
      const newPreset: Preset = { id: Date.now().toString(), name, params };
      setPresets(prev => [...prev, newPreset]);
      return;
    }

    if (!userId) {
      alert("Please sign in to save presets.");
      return;
    }

    const newPreset = { user_id: userId, name, params };
    
    // Optimistic Update (Show it immediately)
    const tempId = Date.now().toString();
    setPresets(prev => [...prev, { ...newPreset, id: tempId } as Preset]);

    const { data, error } = await supabase!
      .from('presets')
      .insert([newPreset])
      .select()
      .single();

    if (error) {
      console.error("Failed to save preset", error);
      alert("Failed to save preset to cloud.");
      // Rollback
      setPresets(prev => prev.filter(p => p.id !== tempId));
    } else {
      // Replace temp ID with real ID
      setPresets(prev => prev.map(p => p.id === tempId ? (data as Preset) : p));
    }
  };

  const deletePreset = async (id: string) => {
    if (isMockMode) {
        setPresets(prev => prev.filter(p => p.id !== id));
        return;
    }

    // Optimistic Update
    const oldPresets = [...presets];
    setPresets(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase!
      .from('presets')
      .delete()
      .eq('id', id);

    if (error) {
        console.error("Failed to delete", error);
        setPresets(oldPresets); // Rollback
    }
  };

  return { presets, loading, savePreset, deletePreset };
}
