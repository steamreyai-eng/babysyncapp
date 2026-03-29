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
