/**
 * dataStore.ts — Centralized CRUD store for all baby data.
 * Uses Zustand for state management, backed by Supabase for remote persistence.
 * Mirrors the web app's AppStateContext functionality.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type {
  BabyProfile,
  Feeding,
  Sleep,
  Diaper,
  GrowthRecord,
  Medication,
  Vaccination,
  Walk,
  DoctorVisit,
  Task,
  ShiftRecord,
} from '../types';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import { pushNow } from '../db/sync';

// Helper: makes recorded_by optional since the store auto-fills it from getActiveParent()
type AddInput<T> = Omit<T, 'id' | 'created_at' | 'recorded_by'> & { created_at?: string; recorded_by?: 'mom' | 'dad' };

interface DataState {
  // ── Data ──
  feedings: Feeding[];
  sleeps: Sleep[];
  diapers: Diaper[];
  growthRecords: GrowthRecord[];
  medications: Medication[];
  vaccinations: Vaccination[];
  walks: Walk[];
  doctorVisits: DoctorVisit[];
  tasks: Task[];
  selectedDate: Date;
  loading: boolean;

  // ── Setters ──
  setSelectedDate: (date: Date) => void;

  // ── Data Loading ──
  loadDayData: (date?: Date) => Promise<void>;
  loadAllMeta: () => Promise<void>;
  reload: () => Promise<void>;

  // ── Feeding CRUD ──
  addFeeding: (f: AddInput<Feeding>) => Promise<void>;
  updateFeeding: (id: string, updates: Partial<Omit<Feeding, 'id'>>) => Promise<void>;
  deleteFeeding: (id: string) => Promise<void>;

  // ── Sleep CRUD ──
  addSleep: (s: AddInput<Sleep>) => Promise<void>;
  updateSleep: (id: string, updates: Partial<Omit<Sleep, 'id'>>) => Promise<void>;
  deleteSleep: (id: string) => Promise<void>;

  // ── Diaper CRUD ──
  addDiaper: (d: AddInput<Diaper>) => Promise<void>;
  updateDiaper: (id: string, updates: Partial<Omit<Diaper, 'id'>>) => Promise<void>;
  deleteDiaper: (id: string) => Promise<void>;

  // ── Walk CRUD ──
  addWalk: (w: AddInput<Walk>) => Promise<void>;
  deleteWalk: (id: string) => Promise<void>;

  // ── Growth CRUD ──
  addGrowthRecord: (g: AddInput<GrowthRecord>) => Promise<void>;

  // ── Medication CRUD ──
  addMedication: (m: AddInput<Medication>) => Promise<void>;
  toggleMedication: (id: string, taken: boolean) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Omit<Medication, 'id'>>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;

  // ── Vaccination ──
  toggleVaccination: (vaccine_name: string, done: boolean) => Promise<void>;

  // ── Doctor Visits ──
  addDoctorVisit: (v: AddInput<DoctorVisit>) => Promise<void>;

  // ── Tasks ──
  addTask: (title: string, due_time?: string) => Promise<void>;
  toggleTask: (id: string, is_completed: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // ── Shifts ──
  transferShift: () => Promise<void>;

  // ── Baby Profile ──
  updateBaby: (updates: Partial<Omit<BabyProfile, 'id'>>) => Promise<void>;

  // ── Session ──
  clearData: () => void;
}

const getActiveParent = () => useAuthStore.getState().activeParent;
const getBaby = () => useAuthStore.getState().baby;
const getUserId = () => useAuthStore.getState().session?.user?.id;

// ── Helper: date range for a single day ──
function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const useDataStore = create<DataState>((set, get) => ({
  feedings: [],
  sleeps: [],
  diapers: [],
  growthRecords: [],
  medications: [],
  vaccinations: [],
  walks: [],
  doctorVisits: [],
  tasks: [],
  selectedDate: new Date(),
  loading: false,

  clearData: () => set({
    feedings: [],
    sleeps: [],
    diapers: [],
    growthRecords: [],
    medications: [],
    vaccinations: [],
    walks: [],
    doctorVisits: [],
    tasks: [],
    selectedDate: new Date(),
    loading: false,
  }),

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    get().loadDayData(date);
  },

  // ── Load day-scoped data (feedings, sleeps, diapers, walks) ──
  loadDayData: async (date?: Date) => {
    const d = date || get().selectedDate;
    const { start, end } = dayRange(d);
    set({ loading: true });
    try {
      const [
        { data: feedingsData },
        { data: sleepsData },
        { data: diapersData },
        { data: walksData },
      ] = await Promise.all([
        supabase.from('feedings').select('*').is('deleted_at', null).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('sleeps').select('*').is('deleted_at', null).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('diapers').select('*').is('deleted_at', null).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('walks').select('*').is('deleted_at', null).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
      ]);

      set({
        feedings: (feedingsData as Feeding[]) || [],
        sleeps: (sleepsData as Sleep[]) || [],
        diapers: (diapersData as Diaper[]) || [],
        walks: (walksData as Walk[]) || [],
      });
    } catch (e) {
      if (__DEV__) console.warn('Error loading day data:', e);
    } finally {
      set({ loading: false });
    }
  },

  // ── Load non-date-scoped data (growth, meds, visits, vacs, tasks, shifts) ──
  loadAllMeta: async () => {
    try {
      const [
        { data: growthData },
        { data: medsData },
        { data: visitsData },
        { data: vacData },
        { data: tasksData },
      ] = await Promise.all([
        supabase.from('growth_records').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
        supabase.from('medications').select('*').is('deleted_at', null).order('created_at'),
        supabase.from('doctor_visits').select('*').is('deleted_at', null).order('visit_date', { ascending: false }),
        supabase.from('vaccinations').select('*').is('deleted_at', null).order('date_given', { ascending: false }),
        supabase.from('tasks').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
      ]);

      set({
        growthRecords: (growthData as GrowthRecord[]) || [],
        medications: (medsData as Medication[]) || [],
        doctorVisits: (visitsData as DoctorVisit[]) || [],
        vaccinations: (vacData as Vaccination[]) || [],
        tasks: (tasksData as Task[]) || [],
      });

      // ── Auto-detect active parent from today's shift schedule ──
      const todayStr = new Date().toISOString().split('T')[0];
      try {
        const todayShifts = await database.collections.get('shifts')
          .query(
            Q.where('shift_date', todayStr),
            Q.where('assigned_to', Q.notEq(null))
          ).fetch();

        if (todayShifts.length > 0) {
          useAuthStore.getState().setActiveParent((todayShifts[0] as any).assigned_to as 'mom' | 'dad');
        } else {
          const latestShifts = await database.collections.get('shifts')
            .query(
              Q.where('shift_date', null),
              Q.sortBy('updated_at', Q.desc),
              Q.take(1)
            ).fetch();
          if (latestShifts.length > 0) {
            useAuthStore.getState().setActiveParent((latestShifts[0] as any).active_parent as 'mom' | 'dad');
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('Error loading shifts from WatermelonDB:', e);
      }
    } catch (e) {
      if (__DEV__) console.warn('Error loading meta data:', e);
    }
  },

  reload: async () => {
    await Promise.all([get().loadDayData(), get().loadAllMeta()]);
  },

  // ── Feeding ──
  addFeeding: async (f) => {
    const payload = { ...f, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('feedings').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ feedings: [data as Feeding, ...s.feedings] }));
  },
  updateFeeding: async (id, updates) => {
    const { data, error } = await supabase.from('feedings').update(updates).eq('id', id).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ feedings: s.feedings.map((f) => f.id === id ? (data as Feeding) : f) }));
  },
  deleteFeeding: async (id) => {
    const { error } = await supabase.from('feedings').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ feedings: s.feedings.filter((f) => f.id !== id) }));
  },

  // ── Sleep ──
  addSleep: async (s) => {
    const payload = { ...s, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('sleeps').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((st) => ({ sleeps: [data as Sleep, ...st.sleeps] }));
  },
  updateSleep: async (id, updates) => {
    const { data, error } = await supabase.from('sleeps').update(updates).eq('id', id).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ sleeps: s.sleeps.map((sl) => sl.id === id ? (data as Sleep) : sl) }));
  },
  deleteSleep: async (id) => {
    const { error } = await supabase.from('sleeps').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ sleeps: s.sleeps.filter((sl) => sl.id !== id) }));
  },

  // ── Diaper ──
  addDiaper: async (d) => {
    const payload = { ...d, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('diapers').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ diapers: [data as Diaper, ...s.diapers] }));
  },
  updateDiaper: async (id, updates) => {
    const { data, error } = await supabase.from('diapers').update(updates).eq('id', id).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ diapers: s.diapers.map((d) => d.id === id ? (data as Diaper) : d) }));
  },
  deleteDiaper: async (id) => {
    const { error } = await supabase.from('diapers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ diapers: s.diapers.filter((d) => d.id !== id) }));
  },

  // ── Walk ──
  addWalk: async (w) => {
    const payload = { ...w, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('walks').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ walks: [data as Walk, ...s.walks] }));
  },
  deleteWalk: async (id) => {
    const { error } = await supabase.from('walks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ walks: s.walks.filter((w) => w.id !== id) }));
  },

  // ── Growth ──
  addGrowthRecord: async (g) => {
    const payload = { ...g, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('growth_records').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ growthRecords: [data as GrowthRecord, ...s.growthRecords] }));
  },

  // ── Medication ──
  addMedication: async (m) => {
    const payload = { ...m, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('medications').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ medications: [...s.medications, data as Medication] }));
  },
  toggleMedication: async (id, taken) => {
    const { error } = await supabase.from('medications').update({ taken }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ medications: s.medications.map((m) => m.id === id ? { ...m, taken } : m) }));
  },
  updateMedication: async (id, updates) => {
    const { data, error } = await supabase.from('medications').update(updates).eq('id', id).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ medications: s.medications.map((m) => m.id === id ? (data as Medication) : m) }));
  },
  deleteMedication: async (id) => {
    const { error } = await supabase.from('medications').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }));
  },

  // ── Vaccination ──
  toggleVaccination: async (vaccine_name, done) => {
    if (done) {
      const { data, error } = await supabase
        .from('vaccinations')
        .insert([{ vaccine_name, recorded_by: getActiveParent(), user_id: getUserId() }])
        .select()
        .single();
      if (error) { if (__DEV__) console.error('error:', error); return; }
      set((s) => ({ vaccinations: [...s.vaccinations, data as Vaccination] }));
    } else {
      const { error } = await supabase.from('vaccinations').update({ deleted_at: new Date().toISOString() }).eq('vaccine_name', vaccine_name);
      if (error) { if (__DEV__) console.error('error:', error); return; }
      set((s) => ({ vaccinations: s.vaccinations.filter((v) => v.vaccine_name !== vaccine_name) }));
    }
  },

  // ── Doctor Visits ──
  addDoctorVisit: async (v) => {
    const payload = { ...v, recorded_by: getActiveParent(), user_id: getUserId() };
    const { data, error } = await supabase.from('doctor_visits').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ doctorVisits: [data as DoctorVisit, ...s.doctorVisits] }));
  },

  // ── Tasks ──
  addTask: async (title, due_time) => {
    const payload = { title, is_completed: false, recorded_by: getActiveParent(), due_time, user_id: getUserId() };
    const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ tasks: [...s.tasks, data as Task] }));
  },
  toggleTask: async (id, is_completed) => {
    const { error } = await supabase.from('tasks').update({ is_completed }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, is_completed } : t) }));
  },
  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (__DEV__) console.error('error:', error); return; }
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  // ── Shifts ──
  transferShift: async () => {
    const currentParent = getActiveParent();
    const next = currentParent === 'mom' ? 'dad' : 'mom';
    try {
      await database.write(async () => {
        await database.get('shifts').create((s: any) => {
          s.active_parent = next;
          s.started_at = Date.now();
          s.updated_at = Date.now();
        });
      });
      pushNow();
      useAuthStore.getState().setActiveParent(next);
    } catch (e) {
      if (__DEV__) console.warn('Error saving shift locally:', e);
    }
  },

  // ── Baby Profile ──
  updateBaby: async (updates) => {
    const baby = getBaby();
    if (!baby) return;
    const { data, error } = await supabase.from('baby_profile').update(updates).eq('id', baby.id).select().single();
    if (error) { if (__DEV__) console.error('error:', error); return; }
    useAuthStore.getState().setBaby(data as BabyProfile);
  },
}));
