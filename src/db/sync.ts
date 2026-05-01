/**
 * sync.ts — WatermelonDB ↔ Supabase sync adapter (v3).
 *
 * v3 improvements over v2:
 * - FIXED: No longer loads ALL local records into RAM on every pull
 *   → Uses point-lookups (find) instead of full-table scan
 * - FIXED: Feedback loop protection — tracks last push time
 * - FIXED: updated_at guaranteed on push for updated records
 * - Uses `updated_at` for detecting remote changes (catches edits)
 * - Parallel pull queries via Promise.all
 * - Soft-delete sync (deleted_at IS NOT NULL → delete locally)
 * - Batch push via upsert
 * - Throttle + singleton promise for sync coalescing
 */

import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './index'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

const SYNC_TABLES = [
  'feedings',
  'sleeps',
  'diapers',
  'walks',
  'tasks',
  'growth_records',
  'medications',
  'vaccinations',
  'doctor_visits',
  'shifts',
  'insight_cards',
] as const;

// Track if local changes exist (set by WatermelonDB observers or manual flag)
let _dirty = false;
let lastSyncedAt: string | null = null;

export function markDirty() {
  _dirty = true;
}

export function isDirty() {
  return _dirty;
}

let _syncPromise: Promise<void> | null = null;
let _lastSyncTimestamp = 0;

// Track when we last pushed to prevent feedback loops from Realtime
let _lastPushTimestamp = 0;
export function getLastPushTimestamp() {
  return _lastPushTimestamp;
}

export async function syncWithSupabase(force = false) {
  if (_syncPromise) return _syncPromise;
  const now = Date.now();
  // Prevent spamming sync within 2 seconds for automatic triggers
  if (!force && now - _lastSyncTimestamp < 2000) return;

  _syncPromise = (async () => {
    if (__DEV__) console.log('[sync] Starting sync...');

    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const timestamp = lastPulledAt
            ? new Date(lastPulledAt).toISOString()
            : new Date(0).toISOString();

          // ── Resolve baby_id for cross-parent data sharing ──
          const userId = useAuthStore.getState().session?.user?.id;
          let babyId: string | null = null;
          try {
            const { data: profile } = await supabase
              .from('baby_profile')
              .select('id, baby_id')
              .eq('user_id', userId)
              .limit(1)
              .single();
            // baby_id column may not exist — fall back to profile.id
            babyId = profile?.baby_id || profile?.id || null;
          } catch {
            // Graceful fallback — pull without baby_id filter
          }

          if (__DEV__) console.log(`[sync] Pull: baby_id=${babyId}, since=${timestamp}`);

          // ── Parallel pull: all tables at once ──
          const pullResults = await Promise.all(
            SYNC_TABLES.map(async (table) => {
              try {
                // Build query: pull records where updated_at > lastPulled
                let query = supabase
                  .from(table)
                  .select('*')
                  .gt('updated_at', timestamp)
                  .order('updated_at', { ascending: true });

                // Filter by baby_id to get BOTH parents' data for the same baby
                // This bypasses RLS user_id scoping issues
                if (babyId) {
                  query = query.eq('baby_id', babyId);
                }

                const { data: records, error } = await query;

                if (error) {
                  if (__DEV__) console.warn(`[sync] Pull error for ${table}:`, error.message);
                  // If baby_id filter fails (column doesn't exist), retry without it
                  if (error.message?.includes('baby_id')) {
                    const { data: fallbackRecords, error: fallbackError } = await supabase
                      .from(table)
                      .select('*')
                      .gt('updated_at', timestamp)
                      .order('updated_at', { ascending: true });
                    if (fallbackError || !fallbackRecords?.length) {
                      return { table, created: [], updated: [], deleted: [] as string[] };
                    }
                    // Continue with fallback records below
                    return await processPullRecords(table, fallbackRecords);
                  }
                  return { table, created: [], updated: [], deleted: [] as string[] };
                }

                // Skip if nothing changed remotely
                if (!records || records.length === 0) {
                  return { table, created: [], updated: [], deleted: [] as string[] };
                }

                return await processPullRecords(table, records);
              } catch (e) {
                if (__DEV__) console.warn(`[sync] Pull exception for ${table}:`, e);
                return { table, created: [], updated: [], deleted: [] as string[] };
              }
            })
          );

          async function processPullRecords(table: string, records: any[]) {
                const localCollection = database.get(table);
                const validColumns = Object.keys(localCollection.schema.columns);
                const allowedFields = ['id', 'created_at', ...validColumns];

                const created: any[] = [];
                const updated: any[] = [];
                const deleted: string[] = [];

                // ── Point-lookup for each remote record instead of loading ALL local records ──
                for (const r of records) {
                  // ── Validate required fields ──
                  if (!r.id || typeof r.id !== 'string') continue;

                  // ── Soft-delete detection ──
                  if (r.deleted_at) {
                    try {
                      await localCollection.find(r.id);
                      // Record exists locally → mark for deletion
                      deleted.push(r.id);
                    } catch {
                      // Record doesn't exist locally → nothing to delete
                    }
                    continue;
                  }

                  // Map fields to local schema
                  const mapped: any = {};
                  for (const field of allowedFields) {
                    if (r[field] !== undefined) mapped[field] = r[field];
                  }
                  if (!mapped.id) continue;

                  // Validate timestamps — reject records with unparseable dates
                  if (r.created_at && isNaN(new Date(r.created_at).getTime())) continue;
                  if (r.updated_at && isNaN(new Date(r.updated_at).getTime())) continue;

                  // Convert timestamps to milliseconds for WatermelonDB
                  if (r.created_at) mapped.created_at = new Date(r.created_at).getTime();
                  if (r.updated_at) mapped.updated_at = new Date(r.updated_at).getTime();

                  try {
                    const lr = await localCollection.find(mapped.id);
                    // Record exists — check if there are actual diffs
                    let hasDiff = false;
                    for (const field of allowedFields) {
                       if (field === 'updated_at') continue;
                       const localVal = (lr as any)[field] == null ? null : (lr as any)[field];
                       const remoteVal = mapped[field] == null ? null : mapped[field];
                       if (localVal !== remoteVal) {
                          hasDiff = true;
                          break;
                       }
                    }
                    if (hasDiff) {
                       updated.push(mapped);
                    }
                  } catch {
                    // Record not found locally → it's new
                    created.push(mapped);
                  }
                }

                return { table, created, updated, deleted };
          }


          // Build changes object
          const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};
          for (const result of pullResults) {
            changes[result.table] = {
              created: result.created,
              updated: result.updated,
              deleted: result.deleted,
            };
          }

          return {
            changes,
            timestamp: Date.now(),
          };
        },

        pushChanges: async ({ changes }: any) => {
          const pushStartTime = Date.now();

          // Resolve baby_id once for the entire push cycle
          const userId = useAuthStore.getState().session?.user?.id;
          let babyId: string | null = null;
          try {
            const { data: profile } = await supabase
              .from('baby_profile')
              .select('id, baby_id')
              .eq('user_id', userId)
              .limit(1)
              .single();
            // baby_id column may not exist — fall back to profile.id
            babyId = profile?.baby_id || profile?.id || null;
          } catch {
            // baby_id column may not exist yet — graceful fallback
          }
          if (__DEV__) console.log(`[sync] Push: baby_id=${babyId}, user_id=${userId}`);
          for (const table of SYNC_TABLES) {
            const tableChanges = (changes as any)[table];
            if (!tableChanges) continue;

            // ── Push created records (batch upsert) ──
            if (tableChanges.created?.length > 0) {
              const cleaned = tableChanges.created.map((r: any) => {
                const { _status, _changed, deleted_at, ...rest } = r;

                // Convert all known timestamp/epoch fields to ISO strings for Supabase `timestampz` columns
                const timeFields = ['created_at', 'updated_at', 'start_time', 'end_time', 'due_time', 'started_at'];
                for (const tf of timeFields) {
                  if (rest[tf]) {
                    const num = typeof rest[tf] === 'string' ? parseInt(rest[tf], 10) : rest[tf];
                    if (!isNaN(num) && num > 100000000000) { // basic check for valid ms epoch
                      rest[tf] = new Date(num).toISOString();
                    }
                  }
                }

                return {
                  ...rest,
                  user_id: rest.user_id || userId,
                  baby_id: rest.baby_id || babyId,
                  created_at: rest.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(), // Always set fresh updated_at
                };
              });
              const { error } = await supabase.from(table).upsert(cleaned);
              if (error) {
                if (__DEV__) console.warn(`[sync] Push create error for ${table}:`, error.message);
                throw new Error(`Push create error on ${table}: ${error.message}`);
              }
            }

            // ── Push updated records (batch upsert instead of sequential update) ──
            if (tableChanges.updated?.length > 0) {
              const cleaned = tableChanges.updated.map((r: any) => {
                const { _status, _changed, ...rest } = r;

                const timeFields = ['created_at', 'updated_at', 'deleted_at', 'start_time', 'end_time', 'due_time', 'started_at'];
                for (const tf of timeFields) {
                  if (rest[tf]) {
                    const num = typeof rest[tf] === 'string' ? parseInt(rest[tf], 10) : rest[tf];
                    if (!isNaN(num) && num > 100000000000) {
                      rest[tf] = new Date(num).toISOString();
                    }
                  }
                }
                // Guarantee fresh updated_at so other devices see the change
                rest.updated_at = new Date().toISOString();
                // Attach baby_id if not already set
                if (!rest.baby_id && babyId) rest.baby_id = babyId;
                return rest;
              });
              const { error } = await supabase.from(table).upsert(cleaned);
              if (error) {
                if (__DEV__) console.warn(`[sync] Push update error for ${table}:`, error.message);
                throw new Error(`Push update error on ${table}: ${error.message}`);
              }
            }

            // ── Push deleted records (soft-delete: set deleted_at) ──
            if (tableChanges.deleted?.length > 0) {
              const { error } = await supabase
                .from(table)
                .update({ deleted_at: new Date().toISOString() })
                .in('id', tableChanges.deleted);
              if (error) {
                if (__DEV__) console.warn(`[sync] Push delete error for ${table}:`, error.message);
                throw new Error(`Push delete error on ${table}: ${error.message}`);
              }
            }
          }

          _dirty = false;
          _lastPushTimestamp = pushStartTime;
        },
      });

      lastSyncedAt = new Date().toISOString();
      if (__DEV__) console.log('[sync] Sync OK at', lastSyncedAt);
    } catch (e) {
      if (__DEV__) console.error('[sync] Sync failed:', e);
      throw e;
    } finally {
      _lastSyncTimestamp = Date.now();
      _syncPromise = null;
    }
  })();
  return _syncPromise;
}

export function getLastSyncedAt() {
  return lastSyncedAt;
}

/**
 * pushNow() — Call after any database.write() to immediately
 * push local changes to Supabase. This eliminates the 2-min
 * wait for periodic sync and makes cross-device updates near-instant.
 */
export function pushNow() {
  // Small delay to let WatermelonDB commit the transaction
  setTimeout(() => {
    syncWithSupabase(true).catch(e => {
      if (__DEV__) console.warn('[sync] pushNow failed:', e);
    });
  }, 200);
}
