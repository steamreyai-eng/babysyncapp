process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Feather: 'Feather',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return View;
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn((callback) => callback()),
  useNavigationState: jest.fn((selector) => selector({
    index: 0,
    routes: [{ name: 'Home' }],
  })),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((length) => new Uint8Array(length).fill(7)),
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  copyAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn(() => jest.fn()),
  },
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@notifee/react-native', () => {
  const notifee = {
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue('default'),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
  };
  return {
    __esModule: true,
    default: notifee,
    AndroidImportance: { DEFAULT: 3, HIGH: 4 },
    AndroidVisibility: { PUBLIC: 1 },
    EventType: { PRESS: 1, ACTION_PRESS: 2, DISMISSED: 3 },
  };
});

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }) => React.createElement(View, null, children),
    Swipeable: ({ children }) => React.createElement(View, null, children),
  };
});

const { NativeModules } = require('react-native');
NativeModules.WMDatabaseBridge = {
  initialize: jest.fn().mockResolvedValue({ code: 'ok' }),
  setUpWithSchema: jest.fn().mockResolvedValue({}),
  setUpWithMigrations: jest.fn().mockResolvedValue({}),
  find: jest.fn().mockResolvedValue({}),
  query: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  batch: jest.fn().mockResolvedValue({}),
  batchJSON: jest.fn().mockResolvedValue({}),
  getDeletedRecords: jest.fn().mockResolvedValue([]),
  destroyDeletedRecords: jest.fn().mockResolvedValue({}),
  unsafeResetDatabase: jest.fn().mockResolvedValue({}),
  getLocal: jest.fn().mockResolvedValue(null),
  setLocal: jest.fn().mockResolvedValue({}),
  removeLocal: jest.fn().mockResolvedValue({}),
};
