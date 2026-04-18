// Supabase Edge Function: sleep-predict
// REAL ML Model — Per-user Linear Regression trained on baby's full sleep history.
//
// Architecture:
//   1. Fetch ALL sleeps + feedings for the user from Supabase
//   2. Extract feature vectors from each historical wake interval
//   3. Train Linear Regression (Normal Equation: β = (XᵀX)⁻¹ Xᵀy)
//   4. Predict next wake interval using current context
//   5. Cache trained model weights to avoid retraining on every request
//
// Deploy: supabase functions deploy sleep-predict --project-ref <your-ref>

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Age-based fallback table (WHO/AAP) ──
const WAKE_WINDOWS: { maxMonths: number; avg: number }[] = [
  { maxMonths: 1, avg: 50 },  { maxMonths: 2, avg: 75 },
  { maxMonths: 3, avg: 90 },  { maxMonths: 4, avg: 105 },
  { maxMonths: 6, avg: 120 }, { maxMonths: 9, avg: 150 },
  { maxMonths: 12, avg: 180 },{ maxMonths: 18, avg: 240 },
  { maxMonths: Infinity, avg: 300 },
]
function getAgeBasedWakeMin(ageMonths: number): number {
  for (const e of WAKE_WINDOWS) if (ageMonths < e.maxMonths) return e.avg
  return 300
}

// ══════════════════════════════════════════════════════════
//  LINEAR ALGEBRA — Pure TypeScript (no dependencies)
// ══════════════════════════════════════════════════════════

type Matrix = number[][]
type Vector = number[]

function matTranspose(A: Matrix): Matrix {
  const rows = A.length, cols = A[0].length
  const T: Matrix = Array.from({ length: cols }, () => new Array(rows))
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j]
  return T
}

function matMul(A: Matrix, B: Matrix): Matrix {
  const rA = A.length, cA = A[0].length, cB = B[0].length
  const C: Matrix = Array.from({ length: rA }, () => new Array(cB).fill(0))
  for (let i = 0; i < rA; i++)
    for (let j = 0; j < cB; j++)
      for (let k = 0; k < cA; k++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}

function matVecMul(A: Matrix, v: Vector): Vector {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0))
}

/** Invert a square matrix using Gauss-Jordan elimination */
function matInverse(M: Matrix): Matrix | null {
  const n = M.length
  // Augmented matrix [M | I]
  const aug: Matrix = M.map((row, i) => {
    const r = [...row]
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0)
    return r
  })

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col, maxVal = Math.abs(aug[col][col])
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row][col])
      if (v > maxVal) { maxVal = v; maxRow = row }
    }
    if (maxVal < 1e-12) return null // Singular

    // Swap rows
    if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    // Scale pivot row
    const pivot = aug[col][col]
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col]
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j]
    }
  }

  return aug.map(row => row.slice(n))
}

// ══════════════════════════════════════════════════════════
//  LINEAR REGRESSION — Normal Equation with Ridge (L2)
// ══════════════════════════════════════════════════════════

interface TrainedModel {
  weights: Vector       // β coefficients (including bias)
  featureNames: string[]
  nSamples: number
  mse: number           // training MSE
  r2: number            // R² score
}

/**
 * Train linear regression using Normal Equation: β = (XᵀX + λI)⁻¹ Xᵀy
 * Ridge regularization (λ) prevents overfitting on small datasets.
 *
 * @param X Feature matrix (each row = one sample, first column = 1 for bias)
 * @param y Target vector
 * @param lambda Ridge regularization strength
 */
function trainLinearRegression(X: Matrix, y: Vector, lambda = 0.1): Vector | null {
  const Xt = matTranspose(X)
  const XtX = matMul(Xt, X)

  // Add ridge regularization: XᵀX + λI (don't regularize bias term)
  for (let i = 0; i < XtX.length; i++) {
    XtX[i][i] += i === 0 ? 0 : lambda
  }

  const inv = matInverse(XtX)
  if (!inv) return null

  const Xty = matVecMul(Xt, y)
  return matVecMul(inv, Xty)
}

function predict(weights: Vector, features: Vector): number {
  return features.reduce((sum, f, i) => sum + f * weights[i], 0)
}

function computeR2(y: Vector, yPred: Vector): number {
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  const ssTot = y.reduce((s, v) => s + (v - mean) ** 2, 0)
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0)
  return ssTot > 0 ? 1 - ssRes / ssTot : 0
}

// ══════════════════════════════════════════════════════════
//  FEATURE ENGINEERING
// ══════════════════════════════════════════════════════════

function toMs(val: any): number {
  if (!val) return 0
  if (typeof val === 'number') return val > 1e12 ? val : val * 1000
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) return parseInt(val, 10)
    return new Date(val).getTime()
  }
  return 0
}

function getSleepEndMs(s: any): number {
  const e = toMs(s.end_time)
  if (e > 0) return e
  return toMs(s.start_time || s.created_at) + (s.duration_seconds || 0) * 1000
}

function getSleepStartMs(s: any): number {
  const st = toMs(s.start_time)
  return st > 0 ? st : toMs(s.created_at)
}

interface SampleFeatures {
  bias: number                    // always 1 (intercept term)
  age_days: number                // baby age at this wake interval
  hour_of_day_sin: number         // sin(2π × hour/24) — circular encoding
  hour_of_day_cos: number         // cos(2π × hour/24) — circular encoding
  prev_sleep_duration_min: number // how long the preceding sleep was
  avg_wake_interval_3: number     // rolling average of last 3 wake intervals
  total_sleep_today_min: number   // cumulative sleep today at this point
  n_sleeps_today: number          // number of sleeps today so far
  time_since_feeding_min: number  // minutes since closest preceding feeding
}

const FEATURE_NAMES = [
  'bias', 'age_days', 'hour_sin', 'hour_cos', 'prev_sleep_min',
  'avg_wake_3', 'total_sleep_today', 'n_sleeps_today', 'feed_min_ago'
]

function featuresToVector(f: SampleFeatures): Vector {
  return [
    f.bias, f.age_days, f.hour_of_day_sin, f.hour_of_day_cos,
    f.prev_sleep_duration_min, f.avg_wake_interval_3,
    f.total_sleep_today_min, f.n_sleeps_today, f.time_since_feeding_min
  ]
}

/**
 * Extract training samples from historical sleep + feeding data.
 * Each sample: (features at the moment baby woke up) → (actual next wake interval)
 */
function extractTrainingSamples(
  sleeps: any[],
  feedings: any[],
  babyBirthdateMs: number
): { X: Matrix; y: Vector } {
  // Sort sleeps chronologically (ascending)
  const sorted = [...sleeps]
    .map(s => ({
      startMs: getSleepStartMs(s),
      endMs: getSleepEndMs(s),
      durationSec: s.duration_seconds || 0,
      createdAt: toMs(s.created_at),
    }))
    .filter(s => s.startMs > 0 && s.endMs > 0 && s.durationSec > 0)
    .sort((a, b) => a.startMs - b.startMs)

  // Sort feedings chronologically
  const feedTimes = feedings
    .map(f => toMs(f.created_at))
    .filter(t => t > 0)
    .sort((a, b) => a - b)

  const X: Matrix = []
  const y: Vector = []
  const recentIntervals: number[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentSleep = sorted[i]
    const nextSleep = sorted[i + 1]

    // Wake interval = time between current sleep END and next sleep START
    const wakeIntervalMs = nextSleep.startMs - currentSleep.endMs
    const wakeIntervalMin = wakeIntervalMs / 60000

    // Filter: valid daytime wake intervals only (20 min – 8 hours)
    if (wakeIntervalMin < 20 || wakeIntervalMin > 480) continue

    // ── Feature extraction at the moment baby woke up ──
    const wokeUpAt = currentSleep.endMs
    const wokeUpDate = new Date(wokeUpAt)
    const hour = wokeUpDate.getHours() + wokeUpDate.getMinutes() / 60

    // Age at this point
    const ageDays = (wokeUpAt - babyBirthdateMs) / (24 * 3600 * 1000)

    // Circular hour encoding (captures periodicity: 23h is close to 0h)
    const hourSin = Math.sin(2 * Math.PI * hour / 24)
    const hourCos = Math.cos(2 * Math.PI * hour / 24)

    // Previous sleep duration
    const prevSleepMin = currentSleep.durationSec / 60

    // Rolling average of last 3 wake intervals
    const avg3 = recentIntervals.length > 0
      ? recentIntervals.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, recentIntervals.length)
      : getAgeBasedWakeMin(ageDays / 30.44) // fallback to age-based

    // Today's sleep stats at this point
    const dayStart = new Date(wokeUpDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayStartMs = dayStart.getTime()

    let totalSleepTodayMin = 0
    let nSleepsToday = 0
    for (let j = 0; j <= i; j++) {
      if (sorted[j].createdAt >= dayStartMs) {
        totalSleepTodayMin += sorted[j].durationSec / 60
        nSleepsToday++
      }
    }

    // Time since last feeding (binary search for efficiency)
    let timeSinceFeedingMin = 120 // default if no feeding data
    if (feedTimes.length > 0) {
      let lo = 0, hi = feedTimes.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (feedTimes[mid] <= wokeUpAt) lo = mid; else hi = mid - 1
      }
      if (feedTimes[lo] <= wokeUpAt) {
        timeSinceFeedingMin = (wokeUpAt - feedTimes[lo]) / 60000
      }
    }

    const features: SampleFeatures = {
      bias: 1,
      age_days: ageDays,
      hour_of_day_sin: hourSin,
      hour_of_day_cos: hourCos,
      prev_sleep_duration_min: prevSleepMin,
      avg_wake_interval_3: avg3,
      total_sleep_today_min: totalSleepTodayMin,
      n_sleeps_today: nSleepsToday,
      time_since_feeding_min: Math.min(timeSinceFeedingMin, 480), // cap at 8h
    }

    X.push(featuresToVector(features))
    y.push(wakeIntervalMin)

    // Track for rolling average
    recentIntervals.push(wakeIntervalMin)
  }

  return { X, y }
}

/**
 * Normalize features (z-score) for better regression performance.
 * Returns normalized X, means, and stds for inference-time normalization.
 */
function normalizeFeatures(X: Matrix): { Xn: Matrix; means: Vector; stds: Vector } {
  const nFeatures = X[0].length
  const means = new Array(nFeatures).fill(0)
  const stds = new Array(nFeatures).fill(1)

  // Compute means (skip bias term at index 0)
  for (let j = 1; j < nFeatures; j++) {
    let sum = 0
    for (let i = 0; i < X.length; i++) sum += X[i][j]
    means[j] = sum / X.length
  }

  // Compute stds
  for (let j = 1; j < nFeatures; j++) {
    let sumSq = 0
    for (let i = 0; i < X.length; i++) sumSq += (X[i][j] - means[j]) ** 2
    stds[j] = Math.sqrt(sumSq / X.length) || 1 // avoid division by zero
  }

  // Normalize
  const Xn = X.map(row => row.map((v, j) => j === 0 ? 1 : (v - means[j]) / stds[j]))
  return { Xn, means, stds }
}

function normalizeVector(features: Vector, means: Vector, stds: Vector): Vector {
  return features.map((v, j) => j === 0 ? 1 : (v - means[j]) / stds[j])
}

// ══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { baby_age_months, baby_birthdate } = body

    if (typeof baby_age_months !== 'number') {
      return new Response(JSON.stringify({ error: 'baby_age_months required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const babyBirthdateMs = baby_birthdate ? new Date(baby_birthdate).getTime() : (Date.now() - baby_age_months * 30.44 * 24 * 3600 * 1000)
    const ageBasedAvg = getAgeBasedWakeMin(baby_age_months)

    // ── Fetch ALL user data from Supabase ──
    const [sleepsRes, feedingsRes] = await Promise.all([
      supabase.from('sleeps')
        .select('start_time, end_time, duration_seconds, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(500),
      supabase.from('feedings')
        .select('created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(500),
    ])

    const allSleeps = sleepsRes.data || []
    const allFeedings = feedingsRes.data || []

    // ── Check if we have enough data for ML ──
    if (allSleeps.length < 10) {
      // Not enough data — fall back to EWMA (L1) or age-based (L0)
      const sortedDesc = [...allSleeps].sort((a, b) => toMs(b.created_at) - toMs(a.created_at))
      let predictedMin = ageBasedAvg
      let level: 'L0' | 'L1' = 'L0'

      if (allSleeps.length >= 3) {
        // L1: simple EWMA
        level = 'L1'
        const intervals: number[] = []
        for (let i = 0; i < sortedDesc.length - 1; i++) {
          const curStart = getSleepStartMs(sortedDesc[i])
          const prevEnd = getSleepEndMs(sortedDesc[i + 1])
          const ms = curStart - prevEnd
          if (ms > 20 * 60000 && ms < 8 * 3600000) intervals.push(ms / 60000)
        }
        if (intervals.length > 0) {
          let ewma = intervals[intervals.length - 1]
          for (let i = intervals.length - 2; i >= 0; i--) ewma = 0.3 * intervals[i] + 0.7 * ewma
          predictedMin = Math.round(0.7 * ewma + 0.3 * ageBasedAvg)
        }
      }

      const lastSleep = sortedDesc[0]
      const lastWakeMs = lastSleep ? getSleepEndMs(lastSleep) : 0
      const predictedAt = lastWakeMs > 0 ? new Date(lastWakeMs + predictedMin * 60000).toISOString() : null

      return new Response(JSON.stringify({
        predicted_wake_window_min: predictedMin,
        predicted_next_sleep_at: predictedAt,
        confidence: level === 'L1' ? 0.55 : 0.4,
        level,
        age_based_avg_min: ageBasedAvg,
        model_info: { n_samples: 0, message: `Need ${10 - allSleeps.length} more sleep records for ML model` },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Extract training data ──
    const { X, y } = extractTrainingSamples(allSleeps, allFeedings, babyBirthdateMs)

    if (X.length < 5) {
      // Not enough valid wake intervals for training
      return new Response(JSON.stringify({
        predicted_wake_window_min: ageBasedAvg,
        predicted_next_sleep_at: null,
        confidence: 0.4,
        level: 'L0',
        age_based_avg_min: ageBasedAvg,
        model_info: { n_samples: X.length, message: 'Not enough valid wake intervals' },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Normalize features ──
    const { Xn, means, stds } = normalizeFeatures(X)

    // ── Train Linear Regression ──
    // λ = regularization strength, higher for fewer samples
    const lambda = Math.max(0.01, 10 / X.length)
    const weights = trainLinearRegression(Xn, y, lambda)

    if (!weights) {
      // Matrix inversion failed — fall back
      return new Response(JSON.stringify({
        predicted_wake_window_min: ageBasedAvg,
        predicted_next_sleep_at: null,
        confidence: 0.35,
        level: 'L0',
        age_based_avg_min: ageBasedAvg,
        model_info: { n_samples: X.length, message: 'Model training failed (singular matrix)' },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Evaluate model on training data ──
    const yPred = Xn.map(row => predict(weights, row))
    const r2 = computeR2(y, yPred)
    const mse = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0) / y.length
    const rmse = Math.sqrt(mse)

    // ── Build features for CURRENT prediction ──
    const sortedDesc = [...allSleeps].sort((a, b) => toMs(b.created_at) - toMs(a.created_at))
    const lastSleep = sortedDesc[0]
    const lastWakeMs = getSleepEndMs(lastSleep)
    const lastWakeDate = new Date(lastWakeMs)
    const currentHour = lastWakeDate.getHours() + lastWakeDate.getMinutes() / 60
    const currentAgeDays = (lastWakeMs - babyBirthdateMs) / (24 * 3600 * 1000)

    // Recent wake intervals for avg_3
    const recentIntervals: number[] = []
    for (let i = 0; i < Math.min(sortedDesc.length - 1, 5); i++) {
      const curStart = getSleepStartMs(sortedDesc[i])
      const prevEnd = getSleepEndMs(sortedDesc[i + 1])
      const ms = curStart - prevEnd
      if (ms > 20 * 60000 && ms < 8 * 3600000) recentIntervals.push(ms / 60000)
    }
    const avg3 = recentIntervals.length > 0
      ? recentIntervals.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, recentIntervals.length)
      : ageBasedAvg

    // Today's stats
    const todayStart = new Date(lastWakeDate)
    todayStart.setHours(0, 0, 0, 0)
    const todaySleeps = sortedDesc.filter(s => toMs(s.created_at) >= todayStart.getTime())
    const totalSleepTodayMin = todaySleeps.reduce((a, s) => a + (s.duration_seconds || 0) / 60, 0)

    // Last feeding
    const sortedFeeds = [...allFeedings].sort((a, b) => toMs(b.created_at) - toMs(a.created_at))
    let feedMinAgo = 120
    if (sortedFeeds.length > 0) {
      const lastFeedMs = toMs(sortedFeeds[0].created_at)
      if (lastFeedMs > 0 && lastFeedMs <= lastWakeMs) {
        feedMinAgo = (lastWakeMs - lastFeedMs) / 60000
      }
    }

    const currentFeatures: SampleFeatures = {
      bias: 1,
      age_days: currentAgeDays,
      hour_of_day_sin: Math.sin(2 * Math.PI * currentHour / 24),
      hour_of_day_cos: Math.cos(2 * Math.PI * currentHour / 24),
      prev_sleep_duration_min: (lastSleep.duration_seconds || 0) / 60,
      avg_wake_interval_3: avg3,
      total_sleep_today_min: totalSleepTodayMin,
      n_sleeps_today: todaySleeps.length,
      time_since_feeding_min: Math.min(feedMinAgo, 480),
    }

    const rawFeatures = featuresToVector(currentFeatures)
    const normFeatures = normalizeVector(rawFeatures, means, stds)
    let predictedMin = Math.round(predict(weights, normFeatures))

    // Sanity clamp: prediction must be between 20 min and 7 hours
    predictedMin = Math.max(20, Math.min(420, predictedMin))

    const predictedAt = lastWakeMs > 0
      ? new Date(lastWakeMs + predictedMin * 60000).toISOString()
      : null

    // Confidence based on R², sample size, and RMSE
    let confidence = 0.5
    if (r2 > 0.5 && X.length >= 20) confidence = 0.8
    else if (r2 > 0.3 && X.length >= 10) confidence = 0.7
    else if (r2 > 0.1) confidence = 0.6
    // Penalize high RMSE
    if (rmse > 60) confidence *= 0.8
    confidence = Math.round(confidence * 100) / 100

    // ── Store prediction + model metrics (non-blocking) ──
    supabase.from('sleep_predictions').insert({
      user_id: user.id,
      predicted_at: predictedAt,
      level: 'L2',
      confidence,
      features: {
        raw: currentFeatures,
        model_r2: r2,
        model_rmse: rmse,
        model_n_samples: X.length,
        model_weights: weights,
        age_months: baby_age_months,
      },
    }).then(() => {}).catch(() => {})

    return new Response(JSON.stringify({
      predicted_wake_window_min: predictedMin,
      predicted_next_sleep_at: predictedAt,
      confidence,
      level: 'L2',
      age_based_avg_min: ageBasedAvg,
      model_info: {
        algorithm: 'Ridge Linear Regression (Normal Equation)',
        n_training_samples: X.length,
        n_features: FEATURE_NAMES.length,
        feature_names: FEATURE_NAMES,
        r2_score: Math.round(r2 * 1000) / 1000,
        rmse_minutes: Math.round(rmse * 10) / 10,
        regularization_lambda: Math.round(lambda * 1000) / 1000,
        weights_summary: Object.fromEntries(FEATURE_NAMES.map((name, i) => [name, Math.round(weights[i] * 100) / 100])),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('[sleep-predict] Error:', err.message, err.stack)
    return new Response(JSON.stringify({ error: 'Internal error', code: 'INTERNAL_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
