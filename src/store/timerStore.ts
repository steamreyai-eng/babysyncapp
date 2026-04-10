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
  feedingConfig: {
    leftRunning: boolean;
    rightRunning: boolean;
    lastLeftStart: number | null;
    lastRightStart: number | null;
    accumulatedLeftSeconds: number;
    accumulatedRightSeconds: number;
    sessionStart: number | null;
  };
  setSleepConfig: (config: Partial<TimerState['sleepConfig']>) => void;
  setWalkConfig: (config: Partial<TimerState['walkConfig']>) => void;
  setFeedingConfig: (config: Partial<TimerState['feedingConfig']>) => void;
  clearSleepTimer: () => void;
  clearWalkTimer: () => void;
  clearFeedingTimer: () => void;
  clearAllTimers: () => void;
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
      feedingConfig: {
        leftRunning: false,
        rightRunning: false,
        lastLeftStart: null,
        lastRightStart: null,
        accumulatedLeftSeconds: 0,
        accumulatedRightSeconds: 0,
        sessionStart: null,
      },
      setSleepConfig: (config) => set((state) => ({ sleepConfig: { ...state.sleepConfig, ...config } })),
      setWalkConfig: (config) => set((state) => ({ walkConfig: { ...state.walkConfig, ...config } })),
      setFeedingConfig: (config) => set((state) => ({ feedingConfig: { ...state.feedingConfig, ...config } })),
      clearSleepTimer: () => set((state) => ({ sleepConfig: { ...state.sleepConfig, isRunning: false, startTime: null, quality: 0 } })),
      clearWalkTimer: () => set((state) => ({ walkConfig: { ...state.walkConfig, isRunning: false, startTime: null, notes: '' } })),
      clearFeedingTimer: () => set((state) => ({ feedingConfig: { ...state.feedingConfig, leftRunning: false, rightRunning: false, lastLeftStart: null, lastRightStart: null, accumulatedLeftSeconds: 0, accumulatedRightSeconds: 0, sessionStart: null } })),
      clearAllTimers: () => set((state) => ({
        sleepConfig: { ...state.sleepConfig, isRunning: false, startTime: null, quality: 0 },
        walkConfig: { ...state.walkConfig, isRunning: false, startTime: null, notes: '' },
        feedingConfig: { ...state.feedingConfig, leftRunning: false, rightRunning: false, lastLeftStart: null, lastRightStart: null, accumulatedLeftSeconds: 0, accumulatedRightSeconds: 0, sessionStart: null },
      })),
    }),
    {
      name: 'babysync-timers',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
