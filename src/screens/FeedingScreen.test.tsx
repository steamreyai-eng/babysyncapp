import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FeedingScreen from './FeedingScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component {...props} feedings={[]} />
  );
});

jest.spyOn(Alert, 'alert');

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

jest.mock('../db/syncHelpers', () => ({
  resolveBabyId: jest.fn().mockResolvedValue('baby-1'),
  getCurrentUserId: jest.fn().mockReturnValue('user-1'),
}));

jest.mock('../db/sync', () => ({
  pushNow: jest.fn(),
}));

describe('FeedingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders correctly in breast mode', () => {
    render(<FeedingScreen />);
    
    expect(screen.getAllByText('Грудь').length).toBeGreaterThan(0);
    expect(screen.getByText('← Левая')).toBeTruthy();
    expect(screen.getByText('Правая →')).toBeTruthy();
  });

  it('switches to formula mode and inputs amount', () => {
    render(<FeedingScreen />);
    
    fireEvent.press(screen.getByText('Смесь'));
    expect(screen.getByText('Объём (мл)')).toBeTruthy();

    const input = screen.getByPlaceholderText('120');
    fireEvent.changeText(input, '120');
    expect(input.props.value).toBe('120');
  });

  it('saves feeding correctly', async () => {
    jest.useFakeTimers();
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<FeedingScreen />);

    fireEvent.press(screen.getByLabelText('Запустить таймер кормления'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    fireEvent.press(screen.getByLabelText('Остановить таймер кормления'));
    fireEvent.press(screen.getByText(/Сохранить ГВ/));

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
    jest.useRealTimers();
  });
});
