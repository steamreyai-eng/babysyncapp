/**
 * Timer Notifications Service with Notifee
 * Creates persistent system notifications (visible in notification shade)
 * when Sleep or Walk timers are running.
 * 
 * Features:
 * - Ongoing/Sticky notifications
 * - Native chronometer (ticks every second up)
 * - Themed per tracker (purple for sleep, green for walk)
 * - Quick Actions to Stop timer
 */

import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { LiveActivities } from './liveActivities';
import { database } from '../db';
import { Sleep } from '../db/models/Sleep';
import { Walk } from '../db/models/Walk';
import { Feeding } from '../db/models/Feeding';
import { useTimerStore } from '../store/timerStore';
import { useAuthStore } from '../store/authStore';

const SLEEP_NOTIF_ID = 'babysync-sleep-timer';
const WALK_NOTIF_ID = 'babysync-walk-timer';
const FEEDING_NOTIF_ID = 'babysync-feeding-timer';

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export async function setupTimerNotifications() {
  if (Platform.OS !== 'android') return;

  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'sleep-timer',
    name: 'Таймер сна',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidVisibility.PRIVATE,
  });

  await notifee.createChannel({
    id: 'walk-timer',
    name: 'Таймер прогулки',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidVisibility.PRIVATE,
  });

  await notifee.createChannel({
    id: 'feeding-timer',
    name: 'Таймер кормления',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidVisibility.PRIVATE,
  });
}

export async function startSleepTimerNotification(startTimeMs: number) {
  const startTimeStr = formatTime(startTimeMs);

  if (Platform.OS === 'ios') {
     LiveActivities.startActivity('BabysyncTimer', {
        type: 'sleep',
        title: 'Сон идёт',
        body: `${startTimeStr} – Сейчас`,
        startTime: startTimeMs
     });
     return;
  }

  if (Platform.OS !== 'android') return;

  await notifee.displayNotification({
    id: SLEEP_NOTIF_ID,
    title: '😴 Сон идёт',
    body: `${startTimeStr} – Сейчас`,
    android: {
      channelId: 'sleep-timer',
      color: '#8B6FD4',
      asForegroundService: true, // Mark as foreground service to prevent OS from killing it
      ongoing: true,
      autoCancel: false,
      showChronometer: true,
      chronometerDirection: 'up',
      timestamp: startTimeMs,
      actions: [
        {
          title: 'Остановить сон',
          pressAction: { id: 'stop-sleep' },
        },
      ],
    },
  });
}

export async function cancelSleepTimerNotification() {
  if (Platform.OS === 'ios') {
     LiveActivities.endActivity('BabysyncTimer');
     return;
  }
  if (Platform.OS !== 'android') return;
  try {
    await notifee.cancelNotification(SLEEP_NOTIF_ID);
  } catch (e) {}
}

export async function startWalkTimerNotification(startTimeMs: number) {
  const startTimeStr = formatTime(startTimeMs);

  if (Platform.OS === 'ios') {
     LiveActivities.startActivity('BabysyncTimer', {
        type: 'walk',
        title: 'Прогулка идёт',
        body: `${startTimeStr} – Сейчас`,
        startTime: startTimeMs
     });
     return;
  }

  if (Platform.OS !== 'android') return;

  await notifee.displayNotification({
    id: WALK_NOTIF_ID,
    title: '🚶 Прогулка идёт',
    body: `${startTimeStr} – Сейчас`,
    android: {
      channelId: 'walk-timer',
      color: '#059669',
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      showChronometer: true,
      chronometerDirection: 'up',
      timestamp: startTimeMs,
      actions: [
        {
          title: 'Завершить прогулку',
          pressAction: { id: 'stop-walk' },
        },
      ],
    },
  });
}

export async function cancelWalkTimerNotification() {
  if (Platform.OS === 'ios') {
     LiveActivities.endActivity('BabysyncTimer');
     return;
  }
  if (Platform.OS !== 'android') return;
  try {
    await notifee.cancelNotification(WALK_NOTIF_ID);
  } catch (e) {}
}

export async function startFeedingTimerNotification(
  totalElapsedSecs: number,
  sessionStartMs: number,
  leftRunning: boolean,
  rightRunning: boolean
) {
  const startTimeStr = formatTime(sessionStartMs);
  const runningTimestamp = Date.now() - (totalElapsedSecs * 1000);

  if (Platform.OS === 'ios') {
     LiveActivities.startActivity('BabysyncTimer', {
        type: 'feeding',
        title: '🍼 Кормление грудью',
        body: `${startTimeStr} – Сейчас`,
        startTime: runningTimestamp,
        leftRunning,
        rightRunning
     });
     return;
  }

  if (Platform.OS !== 'android') return;

  const actions = [];
  if (leftRunning) {
    actions.push({ title: 'Остановить Лев.', pressAction: { id: 'stop-feeding-left' } });
  }
  if (rightRunning) {
    actions.push({ title: 'Остановить Прав.', pressAction: { id: 'stop-feeding-right' } });
  }
  
  // If no timer running but we want to show notification, maybe we don't?
  // Usually we only show when something is running.

  await notifee.displayNotification({
    id: FEEDING_NOTIF_ID,
    title: '🍼 Кормление грудью',
    body: `${startTimeStr} – Сейчас`,
    android: {
      channelId: 'feeding-timer',
      color: '#5B9BD5',
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      showChronometer: true,
      chronometerDirection: 'up',
      timestamp: runningTimestamp,
      actions,
    },
  });
}

export async function cancelFeedingTimerNotification() {
  if (Platform.OS === 'ios') {
     LiveActivities.endActivity('BabysyncTimer');
     return;
  }
  if (Platform.OS !== 'android') return;
  try {
    await notifee.cancelNotification(FEEDING_NOTIF_ID);
  } catch (e) {}
}

export async function restoreTimerNotifications(
  sleepRunning: boolean,
  sleepStartTime: number | null,
  walkRunning: boolean,
  walkStartTime: number | null,
  feedingConfig: any
) {
  // Now supports iOS via LiveActivities
  if (sleepRunning && sleepStartTime) {
    await startSleepTimerNotification(sleepStartTime);
  }
  if (walkRunning && walkStartTime) {
    await startWalkTimerNotification(walkStartTime);
  }
  if (feedingConfig?.leftRunning || feedingConfig?.rightRunning) {
    const totalSecs = feedingConfig.accumulatedLeftSeconds + feedingConfig.accumulatedRightSeconds;
    const sessionStart = feedingConfig.sessionStart || Date.now();
    await startFeedingTimerNotification(totalSecs, sessionStart, feedingConfig.leftRunning, feedingConfig.rightRunning);
  }
}

// ── Background Action Handlers ──
export async function handleBackgroundStopSleep() {
  const store = useTimerStore.getState();
  const { startTime, location, quality } = store.sleepConfig;
  if (!startTime) return;

  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds > 0) {
     try {
       await database.write(async () => {
         await database.get<Sleep>('sleeps').create(sleep => {
           sleep.duration_seconds = seconds;
           sleep.location = location || 'crib';
           sleep.quality = quality || 0;
           sleep.start_time = startTime;
           sleep.end_time = Date.now();
           sleep.created_at = startTime;
           sleep.recorded_by = useAuthStore.getState().activeParent || 'mom';
         });
       });
     } catch (error) {
       if (__DEV__) console.warn("Error saving sleep from bg notification", error);
     }
  }
  store.clearSleepTimer();
  await cancelSleepTimerNotification();
}

export async function handleBackgroundStopWalk() {
  const store = useTimerStore.getState();
  const { startTime, location, weather, notes } = store.walkConfig;
  if (!startTime) return;

  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds > 0) {
     try {
       await database.write(async () => {
         await database.get<Walk>('walks').create(walk => {
           walk.duration_seconds = seconds;
           walk.location = location || 'park';
           walk.weather = weather || 'sunny';
           walk.notes = (notes || '').trim() || undefined;
           walk.created_at = startTime;
           walk.recorded_by = useAuthStore.getState().activeParent || 'mom';
         });
       });
     } catch (error) {
       if (__DEV__) console.warn("Error saving walk from bg notification", error);
     }
  }
  store.clearWalkTimer();
  await cancelWalkTimerNotification();
}

export async function handleBackgroundStopFeedingLeft() {
  const store = useTimerStore.getState();
  const { feedingConfig, setFeedingConfig } = store;
  if (!feedingConfig.leftRunning) return;

  // Calculate accumulated time for left
  const elapsedSinceStart = feedingConfig.lastLeftStart ? Math.floor((Date.now() - feedingConfig.lastLeftStart) / 1000) : 0;
  const newLeftSecs = feedingConfig.accumulatedLeftSeconds + elapsedSinceStart;

  setFeedingConfig({
    leftRunning: false,
    lastLeftStart: null,
    accumulatedLeftSeconds: newLeftSecs
  });

  // If right is still running, update the notification, else save and cancel
  if (feedingConfig.rightRunning) {
    const totalSecs = newLeftSecs + feedingConfig.accumulatedRightSeconds;
    await startFeedingTimerNotification(totalSecs, feedingConfig.sessionStart || Date.now(), false, true);
  } else {
    // Both stopped, let's keep it in store so user can resume in FAB, 
    // or maybe save immediately? User requested "Stop", meaning pause or complete?
    // Let's just update the notification to remove the lockscreen banner and user can save manually in FAB.
    await cancelFeedingTimerNotification();
  }
}

export async function handleBackgroundStopFeedingRight() {
  const store = useTimerStore.getState();
  const { feedingConfig, setFeedingConfig } = store;
  if (!feedingConfig.rightRunning) return;

  const elapsedSinceStart = feedingConfig.lastRightStart ? Math.floor((Date.now() - feedingConfig.lastRightStart) / 1000) : 0;
  const newRightSecs = feedingConfig.accumulatedRightSeconds + elapsedSinceStart;

  setFeedingConfig({
    rightRunning: false,
    lastRightStart: null,
    accumulatedRightSeconds: newRightSecs
  });

  if (feedingConfig.leftRunning) {
    const totalSecs = feedingConfig.accumulatedLeftSeconds + newRightSecs;
    await startFeedingTimerNotification(totalSecs, feedingConfig.sessionStart || Date.now(), true, false);
  } else {
    await cancelFeedingTimerNotification();
  }
}

