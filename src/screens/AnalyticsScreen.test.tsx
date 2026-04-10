import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AnalyticsScreen from './AnalyticsScreen';
import { useAuthStore } from '../store/authStore';

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
      feedingsAll={[]} 
      sleepsAll={[]} 
      diapersAll={[]} 
      walksAll={[]} 
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
  }
}));

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
