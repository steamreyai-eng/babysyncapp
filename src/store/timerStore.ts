import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerState {
  sleepConfig: {
    isRunning: boolean;
    startTime: number | null;
    location: string;
    quality: number;
  };
  walkConfig: {
    isRunning: boolean;
    startTime: number | null;
    location: string;
    weather: string;
    notes: string;
  };
  setSleepConfig: (config: Partial<TimerState['sleepConfig']>) => void;
  setWalkConfig: (config: Partial<TimerState['walkConfig']>) => void;
  clearSleepTimer: () => void;
  clearWalkTimer: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      sleepConfig: {
        isRunning: false,
        startTime: null,
        location: 'crib',
        quality: 0,
      },
      walkConfig: {
        isRunning: false,
        startTime: null,
        location: 'park',
        weather: 'sunny',
        notes: '',
      },
      setSleepConfig: (config) => set((state) => ({ sleepConfig: { ...state.sleepConfig, ...config } })),
      setWalkConfig: (config) => set((state) => ({ walkConfig: { ...state.walkConfig, ...config } })),
      clearSleepTimer: () => set((state) => ({ sleepConfig: { ...state.sleepConfig, isRunning: false, startTime: null, quality: 0 } })),
      clearWalkTimer: () => set((state) => ({ walkConfig: { ...state.walkConfig, isRunning: false, startTime: null, notes: '' } })),
    }),
    {
      name: 'babysync-timers',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
