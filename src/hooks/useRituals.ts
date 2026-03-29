import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ── Types ── */
export interface RitualStep {
  id: string;
  icon: string;
  label: string;
  durationMin: number;
}

export interface Ritual {
  id: string;
  name: string;
  emoji: string;
  steps: RitualStep[];
  isPreset: boolean;
}

export interface RitualLog {
  id: string;
  ritualId: string;
  ritualName: string;
  date: string;
  completedSteps: string[];
  totalSteps: number;
  startedAt: string;
  finishedAt?: string;
}

/* ── Step Palette ── */
export const STEP_PALETTE: RitualStep[] = [
  { id: 'bath', icon: '🛁', label: 'Купание', durationMin: 10 },
  { id: 'massage', icon: '💆', label: 'Массаж', durationMin: 5 },
  { id: 'cream', icon: '🧴', label: 'Крем / Уход', durationMin: 3 },
  { id: 'change', icon: '👕', label: 'Переодевание', durationMin: 3 },
  { id: 'book', icon: '📖', label: 'Книга / Сказка', durationMin: 10 },
  { id: 'lullaby', icon: '🎵', label: 'Колыбельная', durationMin: 5 },
  { id: 'whitenoise', icon: '🌊', label: 'Белый шум', durationMin: 5 },
  { id: 'feed', icon: '🍼', label: 'Кормление', durationMin: 15 },
  { id: 'cuddle', icon: '🤱', label: 'Обнимашки', durationMin: 5 },
  { id: 'tummytime', icon: '🐣', label: 'Время живота', durationMin: 5 },
  { id: 'play', icon: '🧸', label: 'Тихая игра', durationMin: 10 },
  { id: 'putdown', icon: '🌙', label: 'Укладывание', durationMin: 2 },
];

const LS_RITUALS = 'babysync_rituals';
const LS_LOGS = 'babysync_ritual_logs';

/* ── Hook ── */
export function useRituals() {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [logs, setLogs] = useState<RitualLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedRituals, storedLogs] = await Promise.all([
          AsyncStorage.getItem(LS_RITUALS),
          AsyncStorage.getItem(LS_LOGS),
        ]);
        if (storedRituals) {
          const parsed = JSON.parse(storedRituals) as Ritual[];
          setRituals(parsed.filter(r => !r.id.startsWith('preset-')));
        }
        if (storedLogs) {
          setLogs(JSON.parse(storedLogs));
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  // Persist to AsyncStorage
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(LS_RITUALS, JSON.stringify(rituals)).catch(() => {});
  }, [rituals, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
    const trimmed = logs.filter(l => new Date(l.startedAt).getTime() > cutoff);
    AsyncStorage.setItem(LS_LOGS, JSON.stringify(trimmed)).catch(() => {});
  }, [logs, loaded]);

  const addRitual = useCallback((r: Omit<Ritual, 'id' | 'isPreset'>) => {
    const newRitual: Ritual = { ...r, id: `custom-${Date.now()}`, isPreset: false };
    setRituals(prev => [...prev, newRitual]);
    return newRitual;
  }, []);

  const updateRitual = useCallback((id: string, updates: Partial<Omit<Ritual, 'id'>>) => {
    setRituals(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRitual = useCallback((id: string) => {
    setRituals(prev => prev.filter(r => r.id !== id));
  }, []);

  const startRitual = useCallback((ritualId: string): RitualLog => {
    const ritual = rituals.find(r => r.id === ritualId);
    const log: RitualLog = {
      id: `log-${Date.now()}`,
      ritualId,
      ritualName: ritual?.name || '',
      date: new Date().toISOString().split('T')[0],
      completedSteps: [],
      totalSteps: ritual?.steps.length || 0,
      startedAt: new Date().toISOString(),
    };
    setLogs(prev => [log, ...prev]);
    return log;
  }, [rituals]);

  const completeStep = useCallback((logId: string, stepId: string) => {
    setLogs(prev => prev.map(l => {
      if (l.id !== logId) return l;
      const completed = l.completedSteps.includes(stepId)
        ? l.completedSteps.filter(s => s !== stepId)
        : [...l.completedSteps, stepId];
      return { ...l, completedSteps: completed };
    }));
  }, []);

  const finishRitual = useCallback((logId: string) => {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, finishedAt: new Date().toISOString() } : l));
  }, []);

  const getCompletionRate = useCallback((days = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = logs.filter(l => new Date(l.startedAt) >= cutoff && l.finishedAt);
    if (recent.length === 0) return 0;
    const avg = recent.reduce((sum, l) => sum + (l.completedSteps.length / l.totalSteps), 0) / recent.length;
    return Math.round(avg * 100);
  }, [logs]);

  const getLastLog = useCallback((ritualId: string) => {
    return logs.find(l => l.ritualId === ritualId);
  }, [logs]);

  return { rituals, logs, addRitual, updateRitual, deleteRitual, startRitual, completeStep, finishRitual, getCompletionRate, getLastLog };
}
