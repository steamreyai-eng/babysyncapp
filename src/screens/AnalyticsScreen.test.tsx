import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AnalyticsScreen from './AnalyticsScreen';
import { useAuthStore } from '../store/authStore';

const mockAnalyticsData: {
  feedingsAll: any[];
  sleepsAll: any[];
  diapersAll: any[];
  walksAll: any[];
} = {
  feedingsAll: [],
  sleepsAll: [],
  diapersAll: [],
  walksAll: [],
};

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 месяц'),
}));

jest.mock('../lib/ai', () => ({
  callAI: jest.fn().mockResolvedValue('["Mocked AI Insight"]'),
}));

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      feedingsAll={mockAnalyticsData.feedingsAll} 
      sleepsAll={mockAnalyticsData.sleepsAll} 
      diapersAll={mockAnalyticsData.diapersAll} 
      walksAll={mockAnalyticsData.walksAll} 
    />
  );
});

jest.mock('expo-file-system', () => ({
  writeAsStringAsync: jest.fn(),
  cacheDirectory: 'file://cache/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' }
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: () => {
    const { View } = require('react-native');
    return <View testID="mock-bar-chart" />;
  },
  PieChart: () => {
    const { View } = require('react-native');
    return <View testID="mock-pie-chart" />;
  },
  LineChart: () => {
    const { View } = require('react-native');
    return <View testID="mock-line-chart" />;
  }
}));

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsData.feedingsAll = [];
    mockAnalyticsData.sleepsAll = [];
    mockAnalyticsData.diapersAll = [];
    mockAnalyticsData.walksAll = [];
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        baby: { name: 'Alina', birthdate: '2026-01-01' },
      activeParent: 'mom',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders title and quick filters correctly', () => {
    render(<AnalyticsScreen />);
    
    expect(screen.getByText('Аналитика')).toBeTruthy();
    expect(screen.getAllByText('Сегодня').length).toBeGreaterThan(0);
    expect(screen.getByText('7 дней')).toBeTruthy();
    expect(screen.getByText('30 дней')).toBeTruthy();
  });

  it('switches time periods', () => {
    render(<AnalyticsScreen />);
    
    // Switch to week
    fireEvent.press(screen.getByText('7 дней'));
    // Since we mocked all arrays to empty, data doesn't change visually,
    // but we verify no crash occurs and tab is interactable.
    
    // Switch to month
    fireEvent.press(screen.getByText('30 дней'));
  });

  it('renders AI insights section and allows requesting insight', async () => {
    render(<AnalyticsScreen />);
    
    expect(screen.getByText('AI-Рекомендации')).toBeTruthy();
    
    const requestButton = screen.getByText('Обновить');
    expect(requestButton).toBeTruthy();
    
    fireEvent.press(requestButton);
    
    expect(await screen.findByText('Mocked AI Insight')).toBeTruthy();
  });

  it('renders empty state for charts', () => {
    render(<AnalyticsScreen />);
    
    // Since data arrays are empty, it renders 'Нет данных' for both bar and pie charts
    const emptyStates = screen.getAllByText('Нет данных');
    expect(emptyStates.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates feeding intervals from newest-first records', () => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const earlier = new Date(today);
    earlier.setHours(4, 0, 0, 0);

    mockAnalyticsData.feedingsAll = [
      { id: 'feed-2', created_at: today.getTime(), type: 'formula', formula_volume_ml: 120 },
      { id: 'feed-1', created_at: earlier.getTime(), type: 'formula', formula_volume_ml: 120 },
    ];

    render(<AnalyticsScreen />);

    expect(screen.getByText('240м')).toBeTruthy();
    expect(screen.getByText('Ср. интервал')).toBeTruthy();
  });

  it('uses sleep start and end times for wake-window metrics', () => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const firstStart = day.getTime();
    const firstEnd = firstStart + 7 * 3600 * 1000;
    const secondStart = firstEnd + 2 * 3600 * 1000;
    const secondEnd = secondStart + 60 * 60 * 1000;

    mockAnalyticsData.sleepsAll = [
      { id: 'sleep-2', created_at: secondStart, start_time: secondStart, end_time: secondEnd, duration_seconds: 3600 },
      { id: 'sleep-1', created_at: firstStart, start_time: firstStart, end_time: firstEnd, duration_seconds: 7 * 3600 },
    ];

    render(<AnalyticsScreen />);

    expect(screen.getByText('2ч 0м')).toBeTruthy();
    expect(screen.getByText('Ср. бодрствование')).toBeTruthy();
  });
});
