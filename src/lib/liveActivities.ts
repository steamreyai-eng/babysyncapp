import { NativeModules, Platform } from 'react-native';

// Этот модуль будет связан с кастомным Swift кодом нативно в будущем,
// поскольку стандартные npm пакеты для Live Activities сильно ограничены.
const { BabysyncLiveActivities } = NativeModules;

export const LiveActivities = {
  startActivity: (widgetName: string, data: any) => {
    if (Platform.OS === 'ios' && BabysyncLiveActivities?.startActivity) {
      try {
        BabysyncLiveActivities.startActivity(widgetName, data);
      } catch (e) {
        console.warn('LiveActivities start error', e);
      }
    }
  },
  endActivity: (widgetName: string) => {
    if (Platform.OS === 'ios' && BabysyncLiveActivities?.endActivity) {
      try {
        BabysyncLiveActivities.endActivity(widgetName);
      } catch (e) {
        console.warn('LiveActivities end error', e);
      }
    }
  }
};
