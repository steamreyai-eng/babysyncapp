/**
 * sleepPredictor.ts — Client-side orchestrator for sleep predictions.
 *
 * Strategy:
 *   1. Instantly show LOCAL prediction (L0/L1 via wakeWindowEngine) — no latency
 *   2. In background, call Edge Function (L2 multi-feature model) if online
 *   3. Cache L2 result for 30 minutes
 *   4. Fall back gracefully if Edge Function fails
 */

import { supabase } from './supabase';
import {
  calculateWakeWindow,
  predictNextSleep as localPredict,
  type SleepLike,
  type NextSleepPrediction,
  type WakeWindowResult,
} from './wakeWindowEngine';
import NetInfo from '@react-native-community/netinfo';

// ── Types ──

export interface MLPrediction {
  /** Predicted wake window in minutes */
  wakeWindowMin: number;
  /** When the next sleep should happen */
  predictedAt: Date | null;
  /** Minutes until predicted sleep (negative = overdue) */
  minutesUntil: number | null;
  /** Human-readable message */
  message: string;
  /** Model confidence 0–1 */
  confidence: number;
  /** Which model level produced this */
  level: 'L0' | 'L1' | 'L2';
  /** Whether this came from the server or local engine */
  source: 'local' | 'server';
  /** Whether a server request is in-flight */
  loading: boolean;
  /** Server model metrics (only for server predictions) */
  modelInfo?: {
    algorithm?: string;
    nSamples?: number;
    r2?: number;
    rmseMin?: number;
    featureNames?: string[];
  };
}

// ── Cache ──
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let cachedPrediction: { data: MLPrediction; ts: number } | null = null;

function isCacheValid(): boolean {
  return cachedPrediction !== null && Date.now() - cachedPrediction.ts < CACHE_TTL_MS;
}

// ── Local prediction (instant) ──

export function getLocalPrediction(
  ageMonths: number,
  sleeps: SleepLike[]
): MLPrediction {
  const local = localPredict(ageMonths, sleeps);
  return {
    wakeWindowMin: local.wakeWindow.wakeWindowMin,
    predictedAt: local.predictedAt,
    minutesUntil: local.minutesUntil,
    message: local.message,
    confidence: local.wakeWindow.confidence === 'high' ? 0.75
      : local.wakeWindow.confidence === 'medium' ? 0.6
      : 0.4,
    level: local.wakeWindow.source === 'ewma' ? 'L1' : 'L0',
    source: 'local',
    loading: false,
  };
}

// ── Server prediction (background) ──

/**
 * Fetch ML prediction from the Edge Function.
 * The server fetches ALL user data from Supabase itself,
 * trains a Ridge Linear Regression per-user, and returns the prediction.
 *
 * @param ageMonths Baby's age in months
 * @param babyBirthdate Baby's birthdate ISO string (for accurate age calculation on server)
 */
export async function fetchServerPrediction(
  ageMonths: number,
  babyBirthdate?: string | null
): Promise<MLPrediction | null> {
  try {
    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return null;

    // Check cache
    if (isCacheValid()) return cachedPrediction!.data;

    const { data, error } = await supabase.functions.invoke('sleep-predict', {
      body: {
        baby_age_months: ageMonths,
        baby_birthdate: babyBirthdate || undefined,
      },
    });

    if (error || !data) {
      if (__DEV__) console.warn('[sleepPredictor] Edge Function error:', error);
      return null;
    }

    const prediction: MLPrediction = {
      wakeWindowMin: data.predicted_wake_window_min,
      predictedAt: data.predicted_next_sleep_at ? new Date(data.predicted_next_sleep_at) : null,
      minutesUntil: data.predicted_next_sleep_at
        ? Math.round((new Date(data.predicted_next_sleep_at).getTime() - Date.now()) / 60000)
        : null,
      message: formatPredictionMessage(data.predicted_next_sleep_at, data.predicted_wake_window_min),
      confidence: data.confidence,
      level: data.level,
      source: 'server',
      loading: false,
      modelInfo: data.model_info ? {
        algorithm: data.model_info.algorithm,
        nSamples: data.model_info.n_training_samples,
        r2: data.model_info.r2_score,
        rmseMin: data.model_info.rmse_minutes,
        featureNames: data.model_info.feature_names,
      } : undefined,
    };

    // Cache result
    cachedPrediction = { data: prediction, ts: Date.now() };

    return prediction;
  } catch (e) {
    if (__DEV__) console.warn('[sleepPredictor] Fetch error:', e);
    return null;
  }
}

// ── Invalidate cache (call after recording a new sleep) ──

export function invalidatePredictionCache(): void {
  cachedPrediction = null;
}

// ── Message formatter ──

function formatPredictionMessage(predictedAtISO: string | null, wakeWindowMin: number): string {
  if (!predictedAtISO) return 'Нет данных о пробуждении';

  const predictedMs = new Date(predictedAtISO).getTime();
  const minutesUntil = Math.round((predictedMs - Date.now()) / 60000);

  if (minutesUntil < -30) {
    const overMin = Math.abs(minutesUntil);
    const oh = Math.floor(overMin / 60);
    const om = overMin % 60;
    return `Пора спать! Перегулял(а) ${oh > 0 ? `${oh}ч ` : ''}${om}м`;
  } else if (minutesUntil < 0) {
    return `Пора укладывать (${Math.abs(minutesUntil)} мин назад)`;
  } else if (minutesUntil < 10) {
    return `Скоро пора спать (~${minutesUntil} мин)`;
  } else {
    const h = Math.floor(minutesUntil / 60);
    const m = minutesUntil % 60;
    return `Примерно через ${h > 0 ? `${h}ч ` : ''}${m}м`;
  }
}

/**
 * Format confidence as a user-friendly label.
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 0.8) return 'высокая';
  if (confidence >= 0.6) return 'средняя';
  return 'базовая';
}

/**
 * Format the model level as a user-friendly label.
 */
export function formatLevel(level: 'L0' | 'L1' | 'L2'): string {
  switch (level) {
    case 'L0': return 'по возрасту';
    case 'L1': return 'по истории';
    case 'L2': return 'ML-модель';
  }
}
