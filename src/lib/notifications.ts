/**
 * Notification engine for React Native.
 * Polling-based + expo-notifications for native push.
 * Mirrors web app's notifications.ts logic.
 */

import { Alert, AppState, AppStateStatus } from 'react-native';

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

// ── Notification Delivery ──
// For React Native, we use Alert as a fallback.
// When expo-notifications is configured, replace showNotif with native push.
async function showNotif(title: string, body: string) {
  // In foreground: show React Native Alert
  if (AppState.currentState === 'active') {
    Alert.alert(title, body);
  }
  // TODO: When expo-notifications is installed, schedule a local notification:
  // import * as Notifications from 'expo-notifications';
  // await Notifications.scheduleNotificationAsync({
  //   content: { title, body },
  //   trigger: null, // immediate
  // });
}

// ── Polling Engine ──
let pollerInterval: ReturnType<typeof setInterval> | null = null;
const firedKeys = new Set<string>();

interface PollState {
  lastFeedingMs: number | null;
  lastDiaperMs: number | null;
  lastSleepEndMs: number | null;
  ageMo: number;
}

export function startNotifPoller(
  getLastEvents: () => PollState,
  settings?: NotifSettings
) {
  if (pollerInterval) clearInterval(pollerInterval);

  pollerInterval = setInterval(() => {
    const s = settings || DEFAULT_NOTIF;
    if (!s.feeding && !s.diaper && !s.sleep) return;

    const { lastFeedingMs, lastDiaperMs, lastSleepEndMs, ageMo } = getLastEvents();
    const now = Date.now();

    const recs = getRecommendedIntervals(ageMo);
    const feedInt = s.autoMode ? recs.feed : s.feedingIntervalMin;
    const diapInt = s.autoMode ? recs.diap : s.diaperIntervalMin;
    const sleepInt = s.autoMode ? recs.sleep : s.sleepWindowMin;

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
  }, 60_000); // check every minute
}

export function stopNotifPoller() {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = null;
}
