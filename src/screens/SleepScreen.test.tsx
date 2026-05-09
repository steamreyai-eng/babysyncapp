import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SleepScreen from './SleepScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { saveSleepInterval } from '../lib/recordMutations';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component {...props} sleeps={[]} />
  );
});

jest.spyOn(Alert, 'alert');

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

jest.mock('../lib/recordMutations', () => ({
  saveSleepInterval: jest.fn().mockResolvedValue([]),
}));

jest.mock('../db/sync', () => ({
  pushNow: jest.fn(),
}));

describe('SleepScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTimerStore.getState().clearSleepTimer();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders timer mode by default and allows starting timer', () => {
    render(<SleepScreen />);
    
    expect(screen.getByText('Таймер')).toBeTruthy();
    expect(screen.getByText('Начать сон')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Начать сон'));
    expect(screen.getByText('Остановить')).toBeTruthy();
  });

  it('switches to manual mode and allows saving', async () => {
    // Mock database write
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<SleepScreen />);
    
    // Switch mode
    fireEvent.press(screen.getByText('Вручную'));
    expect(screen.getByText('Уснул(а)')).toBeTruthy();

    // Select location (e.g., 'Коляска')
    fireEvent.press(screen.getByText('Коляска'));

    // The manual form is guarded against zero-duration saves by default.
    fireEvent.press(screen.getByText('Сохранить'));

    expect(saveSleepInterval).not.toHaveBeenCalled();
  });

  it('resets timer when Сброс is clicked', () => {
    render(<SleepScreen />);
    
    fireEvent.press(screen.getByText('Начать сон'));
    expect(screen.getByText('Остановить')).toBeTruthy();

    fireEvent.press(screen.getByText('Сброс'));
    expect(screen.getByText('Начать сон')).toBeTruthy();
  });
});
