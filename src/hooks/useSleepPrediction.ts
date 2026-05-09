import { useEffect, useMemo, useState } from 'react';
import { fetchSleepPrediction, SleepPredictionResponse } from '../lib/sleepPrediction';
import { resolveBabyId } from '../db/syncHelpers';

const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  prediction: SleepPredictionResponse | null;
  promise?: Promise<SleepPredictionResponse | null>;
};

const predictionCache = new Map<string, CacheEntry>();

function safeTime(value: any) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sleepSignature(sleeps: any[]) {
  return sleeps
    .slice(0, 30)
    .map((sleep: any) => {
      const start = safeTime(sleep.start_time) || safeTime(sleep.created_at);
      const end = safeTime(sleep.end_time);
      return `${sleep.id || ''}:${start}:${end}:${sleep.duration_seconds || 0}`;
    })
    .join('|');
}

export function getBabyAgeMonths(birthdate?: string | number | Date | null, fallback = 4) {
  if (!birthdate) return fallback;
  const birthMs = safeTime(birthdate);
  if (!birthMs) return fallback;
  return (Date.now() - birthMs) / (30.44 * 24 * 3600 * 1000);
}

export function formatSleepPredictionDuration(seconds: any) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;

  const roundedMinutes = Math.max(5, Math.round(value / 60 / 5) * 5);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours > 0 && minutes > 0) return `около ${hours} ч ${minutes} мин`;
  if (hours > 0) return `около ${hours} ч`;
  return `около ${minutes} мин`;
}

async function getCachedPrediction(babyId: string, ageMonths: number, sleeps: any[]) {
  const cacheKey = `${babyId}:${Math.round(ageMonths * 10) / 10}:${sleepSignature(sleeps)}`;
  const now = Date.now();
  const cached = predictionCache.get(cacheKey);

  if (cached && cached.expiresAt > now && !cached.promise) {
    return cached.prediction;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetchSleepPrediction(babyId, ageMonths, sleeps);
  predictionCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, prediction: null, promise });

  try {
    const prediction = await promise;
    predictionCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, prediction });
    return prediction;
  } catch (error) {
    predictionCache.delete(cacheKey);
    throw error;
  }
}

export function useSleepPrediction({
  sleeps,
  babyBirthdate,
  enabled = true,
}: {
  sleeps: any[];
  babyBirthdate?: string | number | Date | null;
  enabled?: boolean;
}) {
  const ageMonths = useMemo(() => getBabyAgeMonths(babyBirthdate), [babyBirthdate]);
  const sortedSleeps = useMemo(
    () => [...(sleeps || [])].sort((a: any, b: any) => (safeTime(b.start_time) || safeTime(b.created_at)) - (safeTime(a.start_time) || safeTime(a.created_at))),
    [sleeps],
  );
  const signature = useMemo(() => sleepSignature(sortedSleeps), [sortedSleeps]);
  const [prediction, setPrediction] = useState<SleepPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPrediction() {
      if (!enabled || sortedSleeps.length === 0) {
        setPrediction(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const babyId = await resolveBabyId();
        if (!babyId) {
          if (!cancelled) setPrediction(null);
          return;
        }

        const nextPrediction = await getCachedPrediction(babyId, ageMonths, sortedSleeps);
        if (!cancelled) {
          setPrediction(nextPrediction?.next_sleep_time_ms ? nextPrediction : null);
        }
      } catch (error) {
        if (__DEV__) console.warn('ML Predictor error:', error);
        if (!cancelled) setPrediction(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [ageMonths, enabled, signature, sortedSleeps]);

  return { prediction, isLoading };
}
