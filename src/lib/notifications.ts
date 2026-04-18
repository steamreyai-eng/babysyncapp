/**
 * Notification engine for React Native.
 * Polling-based + @notifee/react-native for native push.
 * Fires reminders when feeding / diaper / sleep intervals are exceeded.
 */

import { Alert, AppState } from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { getPersonalizedSleepInterval, type SleepLike } from './wakeWindowEngine';

// ── Settings ──
export interface NotifSettings {
  feeding: boolean;
  diaper: boolean;
  sleep: boolean;
  feedingIntervalMin: number;
  diaperIntervalMin: number;
  sleepWindowMin: number;
  autoMode: boolean;
}

export const DEFAULT_NOTIF: NotifSettings = {
  feeding: true,
  diaper: true,
  sleep: true,
  feedingIntervalMin: 180,
  diaperIntervalMin: 240,
  sleepWindowMin: 120,
  autoMode: true,
};

export function getRecommendedIntervals(ageMo: number) {
  if (ageMo < 1) return { feed: 120, diap: 180, sleep: 60 };
  if (ageMo < 3) return { feed: 150, diap: 180, sleep: 90 };
  if (ageMo < 6) return { feed: 180, diap: 240, sleep: 120 };
  if (ageMo < 9) return { feed: 210, diap: 240, sleep: 150 };
  return { feed: 240, diap: 300, sleep: 180 };
}

// ── Notifee Channel Setup ──
const REMINDER_CHANNEL_ID = 'babysync-reminders';

export async function initReminderNotifications() {
  try {
    // Request permission on BOTH platforms (iOS needs this for notification shade)
    await notifee.requestPermission();

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: 'Напоминания',
        description: 'Напоминания о кормлении, сне и смене подгузников',
        importance: AndroidImportance.HIGH,
        vibration: true,
        visibility: AndroidVisibility.PRIVATE,
        sound: 'default',
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Error creating reminder channel:', e);
  }
}

// ── Notification Delivery via Notifee ──
let notifCounter = 0;

async function showNotif(title: string, body: string) {
  notifCounter++;

  // Always try native notification (works in foreground AND background)
  try {
    if (Platform.OS === 'android') {
      await notifee.displayNotification({
        id: `reminder-${notifCounter}`,
        title,
        body,
        android: {
          channelId: REMINDER_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          // Don't specify smallIcon — notifee uses the app launcher icon by default.
          // Specifying a non-existent drawable crashes and falls back to Alert.alert().
          pressAction: { id: 'default' },
          autoCancel: true,
          visibility: AndroidVisibility.PRIVATE,
        },
      });
    } else {
      // iOS — show in notification shade even when app is in foreground
      await notifee.displayNotification({
        id: `reminder-${notifCounter}`,
        title,
        body,
        ios: {
          sound: 'default',
          // These ensure the notification appears in the shade/banner
          // even when the app is in the foreground
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Notifee display error:', e);
    // Fallback: show Alert only if app is in foreground and notifee completely fails
    if (AppState.currentState === 'active') {
      Alert.alert(title, body);
    }
  }
}

// ── Helper to read current settings ──
async function loadNotifSettings(): Promise<NotifSettings> {
  try {
    const raw = await AsyncStorage.getItem('notif_settings');
    if (raw) {
      return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] Error reading settings:', e);
  }
  return DEFAULT_NOTIF;
}

async function isNotificationsGloballyEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem('notificationsEnabled');
    // Default to true if not set
    return val !== 'false';
  } catch {
    return true;
  }
}

// ── Polling Engine ──
let pollerInterval: ReturnType<typeof setInterval> | null = null;
const firedKeys = new Set<string>();
let getLastEventsFn: (() => PollState) | null = null;

interface PollState {
  lastFeedingMs: number | null;
  lastDiaperMs: number | null;
  lastSleepEndMs: number | null;
  ageMo: number;
  /** Recent sleep records for personalized wake window (optional, falls back to age-based) */
  recentSleeps?: SleepLike[];
}

async function pollerTick() {
  if (!getLastEventsFn) return;

  // Check global toggle
  const globalEnabled = await isNotificationsGloballyEnabled();
  if (!globalEnabled) return;

  // Read current settings (reactive to user changes)
  const s = await loadNotifSettings();
  if (!s.feeding && !s.diaper && !s.sleep) return;

  const { lastFeedingMs, lastDiaperMs, lastSleepEndMs, ageMo, recentSleeps } = getLastEventsFn();
  const now = Date.now();

  const recs = getRecommendedIntervals(ageMo);
  const feedInt = s.autoMode ? recs.feed : s.feedingIntervalMin;
  const diapInt = s.autoMode ? recs.diap : s.diaperIntervalMin;
  // Use personalized wake window when autoMode + sleep data available
  const sleepInt = s.autoMode
    ? (recentSleeps && recentSleeps.length > 0
        ? getPersonalizedSleepInterval(ageMo, recentSleeps)
        : recs.sleep)
    : s.sleepWindowMin;

  // Feeding
  if (s.feeding && lastFeedingMs != null) {
    const diff = (now - lastFeedingMs) / 60000;
    const key = `feed-${lastFeedingMs}`;
    if (diff >= feedInt && !firedKeys.has(key)) {
      firedKeys.add(key);
      showNotif(
        '🍼 Время кормления!',
        `Прошло ${Math.round(diff)} минут с последнего кормления`
      );
    }
  }

  // Diaper
  if (s.diaper && lastDiaperMs != null) {
    const diff = (now - lastDiaperMs) / 60000;
    const key = `diap-${lastDiaperMs}`;
    if (diff >= diapInt && !firedKeys.has(key)) {
      firedKeys.add(key);
      showNotif(
        '🧷 Пора сменить подгузник!',
        `Прошло ${Math.round(diff)} минут с последней смены`
      );
    }
  }

  // Sleep window
  if (s.sleep && lastSleepEndMs != null) {
    const diff = (now - lastSleepEndMs) / 60000;
    const key = `sleep-${lastSleepEndMs}`;
    if (diff >= sleepInt && !firedKeys.has(key)) {
      firedKeys.add(key);
      showNotif(
        '😴 Окно бодрствования!',
        `Малыш не спит уже ${Math.round(diff)} минут — возможно, пора укладывать`
      );
    }
  }
}

export function startNotifPoller(
  getLastEvents: () => PollState,
  _settings?: NotifSettings // kept for API compat, settings now read from AsyncStorage
) {
  if (pollerInterval) clearInterval(pollerInterval);

  getLastEventsFn = getLastEvents;

  // Run immediately once, then every 60 seconds
  pollerTick();
  pollerInterval = setInterval(pollerTick, 60_000);
}

export function stopNotifPoller() {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = null;
  getLastEventsFn = null;
}

/**
 * Restart the poller (call after settings change).
 * Re-reads settings from AsyncStorage automatically on next tick.
 * If getLastEvents callback was previously set, it keeps using it.
 */
export function restartNotifPoller() {
  if (getLastEventsFn) {
    startNotifPoller(getLastEventsFn);
  }
}

/**
 * Clear the fired-keys cache (useful when new events are added,
 * so the same event key can fire again after the new interval).
 */
export function clearFiredNotifications() {
  firedKeys.clear();
}
