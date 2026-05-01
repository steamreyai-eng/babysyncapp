/**
 * syncHelpers.ts — Utilities for getting baby_id and user_id
 * for use when creating records via database.write().
 * 
 * This ensures every record gets the correct baby_id stamp
 * so cross-parent sync works (pull filters by baby_id).
 */

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

let _cachedBabyId: string | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolves baby_id for the current user. Caches the result for 5 minutes.
 * Falls back to baby_profile.id if baby_id column doesn't exist.
 */
export async function resolveBabyId(): Promise<string | null> {
  const now = Date.now();
  if (_cachedBabyId && now - _cacheTimestamp < CACHE_TTL) {
    return _cachedBabyId;
  }

  const userId = useAuthStore.getState().session?.user?.id;
  if (!userId) return null;

  try {
    const { data: profile } = await supabase
      .from('baby_profile')
      .select('id, baby_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    _cachedBabyId = profile?.baby_id || profile?.id || null;
    _cacheTimestamp = now;
  } catch {
    // Graceful fallback
  }
  return _cachedBabyId;
}

/**
 * Returns current user_id from auth store.
 */
export function getCurrentUserId(): string | undefined {
  return useAuthStore.getState().session?.user?.id;
}

/**
 * Invalidate cached baby_id (call after profile changes).
 */
export function invalidateBabyIdCache() {
  _cachedBabyId = null;
  _cacheTimestamp = 0;
}
