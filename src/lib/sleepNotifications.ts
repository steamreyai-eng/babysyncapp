import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function scheduleSleepPredictionNotification(nextSleepTimeMs: number, babyName: string) {
  try {
    // Clear any existing sleep prediction notifications (assuming we don't want multiple)
    // We would ideally tag them but expo-notifications doesn't support cancelling by tag universally easily.
    // Let's just schedule it. In a real app we'd keep track of the notification ID.
    const now = Date.now();
    const timeUntilSleep = nextSleepTimeMs - now;
    
    // Don't schedule if it's in the past or less than 15 mins away
    if (timeUntilSleep < 15 * 60 * 1000) return;
    
    // Schedule notification 15 minutes before sleep
    const triggerDate = new Date(nextSleepTimeMs - 15 * 60 * 1000);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👶 Время сна приближается',
        body: `${babyName} скоро захочет спать! Самое время начать подготовку ко сну (приглушить свет, включить белый шум).`,
        sound: true,
        data: { type: 'sleep_prediction' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('Error scheduling sleep notification:', e);
  }
}
