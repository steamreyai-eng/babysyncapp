/**
 * wakeWindowEngine.ts — Personalized wake window calculator.
 *
 * Progressive approach:
 *   Level 0: Age-based table (WHO / AAP / Weissbluth norms)
 *   Level 1: EWMA (Exponential Weighted Moving Average) from user data
 *
 * Also provides next-sleep prediction based on the calculated wake window.
 */

// ── Age-based wake window table (minutes) ──
// Sources: WHO infant sleep guidelines, AAP, Weissbluth "Healthy Sleep Habits"
const WAKE_WINDOWS: { maxMonths: number; min: number; max: number; avg: number }[] = [
  { maxMonths: 1,  min: 45,  max: 60,  avg: 50  },
  { maxMonths: 2,  min: 60,  max: 90,  avg: 75  },
  { maxMonths: 3,  min: 75,  max: 105, avg: 90  },
  { maxMonths: 4,  min: 90,  max: 120, avg: 105 },
  { maxMonths: 6,  min: 105, max: 150, avg: 120 },
  { maxMonths: 9,  min: 120, max: 180, avg: 150 },
  { maxMonths: 12, min: 150, max: 210, avg: 180 },
  { maxMonths: 18, min: 180, max: 300, avg: 240 },
  { maxMonths: Infinity, min: 240, max: 360, avg: 300 },
];

// ── Types ──

/** Minimal sleep record shape — works with both WatermelonDB models and plain objects */
export interface SleepLike {
  start_time?: number | string | null;
  end_time?: number | string | null;
  duration_seconds: number;
  created_at: number | string;
}

export interface WakeWindowResult {
  /** Calculated wake window in minutes */
  wakeWindowMin: number;
  /** Whether the result uses personal data or just age table */
  isPersonalized: boolean;
  /** Confidence of the estimate */
  confidence: 'low' | 'medium' | 'high';
  /** Source algorithm */
  source: 'age-table' | 'ewma';
  /** Age-based range for reference */
  ageRange: { min: number; max: number; avg: number };
}

export interface NextSleepPrediction {
  /** When to put the baby down (null if no recent sleep data) */
  predictedAt: Date | null;
  /** Minutes until predicted sleep time (negative = overdue) */
  minutesUntil: number | null;
  /** Human-readable message */
  message: string;
  /** Wake window used for prediction */
  wakeWindow: WakeWindowResult;
}

// ── Helpers ──

/** Safely convert any timestamp-like value to epoch ms */
function toMs(val: number | string | null | undefined): number {
  if (!val) return 0;
  if (typeof val === 'number') return val > 1e12 ? val : val * 1000; // handle seconds vs ms
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    return new Date(val).getTime();
  }
  return 0;
}

/** Get the end-of-sleep timestamp in ms */
function getSleepEndMs(s: SleepLike): number {
  const endMs = toMs(s.end_time);
  if (endMs > 0) return endMs;
  const startMs = toMs(s.start_time) || toMs(s.created_at);
  return startMs + (s.duration_seconds || 0) * 1000;
}

/** Get the start-of-sleep timestamp in ms */
function getSleepStartMs(s: SleepLike): number {
  const startMs = toMs(s.start_time);
  if (startMs > 0) return startMs;
  return toMs(s.created_at);
}

/** Get the age-based wake window bracket */
function getAgeBasedWindow(ageMonths: number): { min: number; max: number; avg: number } {
  for (const entry of WAKE_WINDOWS) {
    if (ageMonths < entry.maxMonths) {
      return { min: entry.min, max: entry.max, avg: entry.avg };
    }
  }
  return { min: 240, max: 360, avg: 300 };
}

/**
 * Extract wake intervals (in minutes) from sorted sleep records.
 * A wake interval = time between end of one sleep and start of the next.
 *
 * @param sleeps Must be sorted by created_at DESCENDING (newest first)
 * @returns Array of intervals in minutes (newest first)
 */
function extractWakeIntervals(sleeps: SleepLike[]): number[] {
  if (sleeps.length < 2) return [];

  const intervals: number[] = [];

  for (let i = 0; i < sleeps.length - 1; i++) {
    const currentStartMs = getSleepStartMs(sleeps[i]);
    const prevEndMs = getSleepEndMs(sleeps[i + 1]);

    if (currentStartMs <= 0 || prevEndMs <= 0) continue;

    const intervalMs = currentStartMs - prevEndMs;

    // Filter: must be between 20 min and 8 hours (valid daytime wake interval)
    if (intervalMs > 20 * 60000 && intervalMs < 8 * 3600000) {
      intervals.push(intervalMs / 60000); // convert to minutes
    }
  }

  return intervals;
}

/**
 * Exponential Weighted Moving Average.
 * More recent intervals have higher weight.
 *
 * @param values Array (newest first)
 * @param alpha Smoothing factor (0–1). Higher = more weight to recent data.
 */
function ewma(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let result = values[values.length - 1]; // start from oldest
  for (let i = values.length - 2; i >= 0; i--) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

// ── Main Functions ──

/**
 * Calculate the personalized wake window for a baby.
 *
 * @param ageMonths Baby's age in months
 * @param sleeps Recent sleep records, sorted by created_at DESC (newest first)
 * @param currentHour Current hour (0–23) for time-of-day adjustment
 */
export function calculateWakeWindow(
  ageMonths: number,
  sleeps: SleepLike[],
  currentHour: number = new Date().getHours()
): WakeWindowResult {
  const ageRange = getAgeBasedWindow(ageMonths);

  // Extract real wake intervals from data
  const intervals = extractWakeIntervals(sleeps);

  let wakeWindowMin: number;
  let isPersonalized: boolean;
  let confidence: 'low' | 'medium' | 'high';
  let source: 'age-table' | 'ewma';

  if (intervals.length < 3) {
    // L0: Not enough data — use age-based table
    wakeWindowMin = ageRange.avg;
    isPersonalized = false;
    confidence = 'low';
    source = 'age-table';
  } else {
    // L1: EWMA personalization
    const personal = ewma(intervals.slice(0, 10), 0.3); // use last 10 max

    // Blend: 70% personal + 30% age-based (stability anchor)
    wakeWindowMin = 0.7 * personal + 0.3 * ageRange.avg;

    // Clamp to reasonable bounds (age-based ±30%)
    const lowerBound = ageRange.min * 0.7;
    const upperBound = ageRange.max * 1.3;
    wakeWindowMin = Math.max(lowerBound, Math.min(upperBound, wakeWindowMin));

    isPersonalized = true;
    confidence = intervals.length >= 7 ? 'high' : 'medium';
    source = 'ewma';
  }

  // Time-of-day adjustment
  if (currentHour >= 12 && currentHour < 17) {
    // Afternoon: slightly longer wake window (post-lunch energy)
    wakeWindowMin *= 1.08;
  } else if (currentHour >= 17) {
    // Evening: shorter wake window (build sleep pressure for night)
    wakeWindowMin *= 0.92;
  }

  wakeWindowMin = Math.round(wakeWindowMin);

  return { wakeWindowMin, isPersonalized, confidence, source, ageRange };
}

/**
 * Predict the next sleep time based on wake window and last sleep data.
 *
 * @param ageMonths Baby's age in months
 * @param sleeps Recent sleep records, sorted by created_at DESC (newest first)
 */
export function predictNextSleep(
  ageMonths: number,
  sleeps: SleepLike[]
): NextSleepPrediction {
  const wakeWindow = calculateWakeWindow(ageMonths, sleeps);

  if (sleeps.length === 0) {
    return {
      predictedAt: null,
      minutesUntil: null,
      message: 'Нет данных о сне',
      wakeWindow,
    };
  }

  // Find the most recent sleep end time
  const lastSleep = sleeps[0]; // sleeps sorted DESC
  const lastWakeUpMs = getSleepEndMs(lastSleep);

  if (lastWakeUpMs <= 0) {
    return {
      predictedAt: null,
      minutesUntil: null,
      message: 'Нет данных о времени пробуждения',
      wakeWindow,
    };
  }

  const predictedMs = lastWakeUpMs + wakeWindow.wakeWindowMin * 60000;
  const predictedAt = new Date(predictedMs);
  const minutesUntil = Math.round((predictedMs - Date.now()) / 60000);

  let message: string;
  if (minutesUntil < -30) {
    const overH = Math.floor(Math.abs(minutesUntil) / 60);
    const overM = Math.abs(minutesUntil) % 60;
    message = `Пора спать! Перегулял(а) ${overH > 0 ? `${overH}ч ` : ''}${overM}м`;
  } else if (minutesUntil < 0) {
    message = `Пора укладывать (${Math.abs(minutesUntil)} мин назад)`;
  } else if (minutesUntil < 10) {
    message = `Скоро пора спать (~${minutesUntil} мин)`;
  } else {
    const h = Math.floor(minutesUntil / 60);
    const m = minutesUntil % 60;
    message = `Примерно через ${h > 0 ? `${h}ч ` : ''}${m}м`;
  }

  return { predictedAt, minutesUntil, message, wakeWindow };
}

/**
 * Get the recommended sleep interval in minutes for notification engine.
 * Drop-in replacement for the sleep part of getRecommendedIntervals().
 */
export function getPersonalizedSleepInterval(
  ageMonths: number,
  sleeps: SleepLike[]
): number {
  const { wakeWindowMin } = calculateWakeWindow(ageMonths, sleeps);
  return wakeWindowMin;
}

/**
 * Format wake window as human-readable string.
 * Example: "2ч 15м" or "1ч 30м (персональное)"
 */
export function formatWakeWindow(result: WakeWindowResult): string {
  const h = Math.floor(result.wakeWindowMin / 60);
  const m = result.wakeWindowMin % 60;
  const time = h > 0
    ? m > 0 ? `${h}ч ${m}м` : `${h}ч`
    : `${m}м`;
  return result.isPersonalized ? `${time} ✦` : time;
}
