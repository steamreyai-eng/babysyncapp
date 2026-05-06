import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import { handleBackgroundStopSleep, handleBackgroundStopWalk, handleBackgroundStopFeedingLeft, handleBackgroundStopFeedingRight } from './src/lib/timerNotifications';

import App from './App';

// Setup background event listener for timer stop buttons.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction?.id === 'stop-sleep') {
      await handleBackgroundStopSleep();
    } else if (detail.pressAction?.id === 'stop-walk') {
      await handleBackgroundStopWalk();
    } else if (detail.pressAction?.id === 'stop-feeding-left') {
      await handleBackgroundStopFeedingLeft();
    } else if (detail.pressAction?.id === 'stop-feeding-right') {
      await handleBackgroundStopFeedingRight();
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
