import * as HapticsPolyfill from 'expo-haptics';
import { Platform } from 'react-native';

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (Platform.OS === 'web') return; // No haptics on web

  try {
    switch (style) {
      case 'light':
        HapticsPolyfill.impactAsync(HapticsPolyfill.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        HapticsPolyfill.impactAsync(HapticsPolyfill.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        HapticsPolyfill.impactAsync(HapticsPolyfill.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        HapticsPolyfill.notificationAsync(HapticsPolyfill.NotificationFeedbackType.Success);
        break;
      case 'warning':
        HapticsPolyfill.notificationAsync(HapticsPolyfill.NotificationFeedbackType.Warning);
        break;
      case 'error':
        HapticsPolyfill.notificationAsync(HapticsPolyfill.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Ignore errors if haptics is not available
  }
};
