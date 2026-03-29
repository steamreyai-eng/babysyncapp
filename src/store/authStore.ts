import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { BabyProfile } from '../types';

export function getAgeLabel(birthdateStr: string): string {
  if (!birthdateStr) return "—";
  const birthdate = new Date(birthdateStr);
  const now = new Date();
  let months = (now.getFullYear() - birthdate.getFullYear()) * 12;
  months -= birthdate.getMonth();
  months += now.getMonth();
  
  let days = now.getDate() - birthdate.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  if (months === 0) return `${days} дн.`;
  if (days === 0) return `${months} мес.`;
  return `${months} мес. · ${days} дн.`;
}

interface AuthState {
  session: Session | null;
  baby: BabyProfile | null;
  loading: boolean;
  onboardingNeeded: boolean;
  activeParent: 'mom' | 'dad';
  setSession: (session: Session | null) => void;
  setBaby: (baby: BabyProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingNeeded: (needed: boolean) => void;
  setActiveParent: (parent: 'mom' | 'dad') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  baby: null,
  loading: true,
  onboardingNeeded: false,
  activeParent: 'mom',
  
  setSession: (session) => set({ session }),
  setBaby: (baby) => set({ baby }),
  setLoading: (loading) => set({ loading }),
  setOnboardingNeeded: (onboardingNeeded) => set({ onboardingNeeded }),
  setActiveParent: (activeParent) => set({ activeParent }),
}));
