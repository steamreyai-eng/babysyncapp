import { supabase } from './supabase';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';

export interface SleepPredictionResponse {
  next_sleep_time_ms?: number;
  predicted_duration_seconds?: number;
  recommended_duration_seconds?: number;
  confidence_score?: number;
  explanation?: string;
  source?: string;
  model_version?: string;
}

function safeTime(value: any) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchSleepPrediction(babyId: string, ageMo: number, sleeps: any[]): Promise<SleepPredictionResponse | null> {
  if (!sleeps || sleeps.length === 0) return null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!babyId || !session?.access_token) {
      return null;
    }

    const recentSleeps = [...sleeps].sort((a: any, b: any) => {
      const aStart = safeTime(a.start_time) || safeTime(a.created_at);
      const bStart = safeTime(b.start_time) || safeTime(b.created_at);
      return bStart - aStart;
    }).slice(0, 30).map((s:any) => {
      const start = safeTime(s.start_time) || safeTime(s.created_at);
      const duration = s.duration_seconds || 0;
      return {
        duration_seconds: duration,
        start_time: start,
        end_time: safeTime(s.end_time) || (start + duration * 1000),
        quality: s.quality || 3
      };
    });
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    
    const recentFeedings = await database.get('feedings').query(
      Q.where('created_at', Q.gt(oneDayAgo)),
      Q.where('baby_id', babyId)
    ).fetch();
    const feedCount24h = recentFeedings.length;
    
    const recentWalks = await database.get('walks').query(
      Q.where('created_at', Q.gt(oneDayAgo)),
      Q.where('baby_id', babyId)
    ).fetch();
    const walkDuration24h = recentWalks.reduce((acc, w: any) => acc + (w.duration_seconds || 0), 0);
    
    const recentHealth = await database.get('health_logs').query(
      Q.where('created_at', Q.gt(oneDayAgo)),
      Q.where('baby_id', babyId),
      Q.where('is_sick', true)
    ).fetch();
    const isSick = recentHealth.length > 0;
    
    const response = await fetch('https://babysyncapp.onrender.com/predict_sleep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        baby_id: babyId,
        baby_age_months: ageMo,
        recent_sleeps: recentSleeps,
        current_time_ms: now,
        feed_count_24h: feedCount24h,
        walk_duration_24h: walkDuration24h,
        is_sick: isSick
      })
    });
    
    if (response.status === 401 || response.status === 403 || !response.ok) {
       if (__DEV__) {
         const errorBody = await response.text().catch(() => '');
         console.warn('ML Predictor response error:', response.status, errorBody);
       }
       return null;
    }

    const data = await response.json();
    const durationSeconds = data.predicted_duration_seconds ?? data.recommended_duration_seconds;
    return {
      ...data,
      predicted_duration_seconds: durationSeconds,
      recommended_duration_seconds: durationSeconds,
    };
  } catch (e) {
    if (__DEV__) console.warn('ML Predictor error:', e);
    return null;
  }
}
