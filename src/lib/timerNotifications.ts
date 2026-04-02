/**
 * Timer Notifications Service
 * Creates persistent system notifications (visible in notification shade)
 * when Sleep or Walk timers are running.
 * 
 * Features:
 * - Sticky/ongoing notifications on Android (cannot be swiped away)
 * - Automatic elapsed time updates every 30 seconds
 * - Themed per tracker (purple for sleep, green for walk)
 * - Cancel on timer stop
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';

// ── Notification IDs (stable so we can update/cancel) ──
const SLEEP_NOTIF_ID = 'babysync-sleep-timer';
const WALK_NOTIF_ID = 'babysync-walk-timer';

// ── Update intervals ──
let sleepUpdateInterval: ReturnType<typeof setInterval> | null = null;
let walkUpdateInterval: ReturnType<typeof setInterval> | null = null;

// ── Format elapsed time ──
function formatElapsed(startTimeMs: number): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ── Setup (call once at app start) ──
export async function setupTimerNotifications() {
  // Set notification handler for foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // Required to appear in Android shade while foregrounded
      shouldShowBanner: false, // Avoid heads-up popup on newest mobile OSes if possible
      shouldShowList: true, // Ensure it is shown in notification history/center
      shouldPlaySound: false,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    }),
  });

  // Create Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sleep-timer', {
      name: 'Таймер сна',
      importance: Notifications.AndroidImportance.LOW, // No sound, just visible
      vibrationPattern: [],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('walk-timer', {
      name: 'Таймер прогулки',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Request permissions (local notifications work on emulators too)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

// ── Sleep Timer Notification ──
export async function startSleepTimerNotification(startTimeMs: number) {
  // Cancel any existing
  await cancelSleepTimerNotification();

  const startTimeStr = formatTime(startTimeMs);
  const elapsed = formatElapsed(startTimeMs);

  await Notifications.scheduleNotificationAsync({
    identifier: SLEEP_NOTIF_ID,
    content: {
      title: '😴 Сон идёт',
      body: `${startTimeStr} – Сейчас  •  ${elapsed}`,
      data: { type: 'sleep-timer', startTime: startTimeMs },
      sound: false,
      sticky: true,
      ...(Platform.OS === 'android' ? {
        channelId: 'sleep-timer',
        color: '#8B6FD4',
      } : {}),
    } as any,
    trigger: null,
  });

  // Start periodic updates
  sleepUpdateInterval = setInterval(async () => {
    try {
      const newElapsed = formatElapsed(startTimeMs);
      await Notifications.scheduleNotificationAsync({
        identifier: SLEEP_NOTIF_ID,
        content: {
          title: '😴 Сон идёт',
          body: `${startTimeStr} – Сейчас  •  ${newElapsed}`,
          data: { type: 'sleep-timer', startTime: startTimeMs },
          sound: false,
          sticky: true,
          ...(Platform.OS === 'android' ? {
            channelId: 'sleep-timer',
            color: '#8B6FD4',
          } : {}),
        } as any,
        trigger: null,
      });
    } catch (e) {
      // Silently fail on update
    }
  }, 30_000); // Update every 30 seconds
}

export async function cancelSleepTimerNotification() {
  if (sleepUpdateInterval) {
    clearInterval(sleepUpdateInterval);
    sleepUpdateInterval = null;
  }
  try {
    await Notifications.dismissNotificationAsync(SLEEP_NOTIF_ID);
    await Notifications.cancelScheduledNotificationAsync(SLEEP_NOTIF_ID);
  } catch (e) {
    // May not exist
  }
}

// ── Walk Timer Notification ──
export async function startWalkTimerNotification(startTimeMs: number) {
  await cancelWalkTimerNotification();

  const startTimeStr = formatTime(startTimeMs);
  const elapsed = formatElapsed(startTimeMs);

  await Notifications.scheduleNotificationAsync({
    identifier: WALK_NOTIF_ID,
    content: {
      title: '🚶 Прогулка идёт',
      body: `${startTimeStr} – Сейчас  •  ${elapsed}`,
      data: { type: 'walk-timer', startTime: startTimeMs },
      sound: false,
      sticky: true,
      ...(Platform.OS === 'android' ? {
        channelId: 'walk-timer',
        color: '#059669',
      } : {}),
    } as any,
    trigger: null,
  });

  walkUpdateInterval = setInterval(async () => {
    try {
      const newElapsed = formatElapsed(startTimeMs);
      await Notifications.scheduleNotificationAsync({
        identifier: WALK_NOTIF_ID,
        content: {
          title: '🚶 Прогулка идёт',
          body: `${startTimeStr} – Сейчас  •  ${newElapsed}`,
          data: { type: 'walk-timer', startTime: startTimeMs },
          sound: false,
          sticky: true,
          ...(Platform.OS === 'android' ? {
            channelId: 'walk-timer',
            color: '#059669',
          } : {}),
        } as any,
        trigger: null,
      });
    } catch (e) {
      // Silently fail on update
    }
  }, 30_000);
}

export async function cancelWalkTimerNotification() {
  if (walkUpdateInterval) {
    clearInterval(walkUpdateInterval);
    walkUpdateInterval = null;
  }
  try {
    await Notifications.dismissNotificationAsync(WALK_NOTIF_ID);
    await Notifications.cancelScheduledNotificationAsync(WALK_NOTIF_ID);
  } catch (e) {
    // May not exist
  }
}

// ── Restore notifications on app restart ──
// Call this when app starts to re-create notifications for running timers
export async function restoreTimerNotifications(
  sleepRunning: boolean,
  sleepStartTime: number | null,
  walkRunning: boolean,
  walkStartTime: number | null
) {
  if (sleepRunning && sleepStartTime) {
    await startSleepTimerNotification(sleepStartTime);
  }
  if (walkRunning && walkStartTime) {
    await startWalkTimerNotification(walkStartTime);
  }
}
