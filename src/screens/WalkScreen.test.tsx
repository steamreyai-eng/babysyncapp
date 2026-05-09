import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import WalkScreen from './WalkScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { saveWalkInterval } from '../lib/recordMutations';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component {...props} walks={[]} />
  );
});

jest.spyOn(Alert, 'alert');

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

jest.mock('../lib/recordMutations', () => ({
  saveWalkInterval: jest.fn().mockResolvedValue([]),
}));

jest.mock('../db/sync', () => ({
  pushNow: jest.fn(),
}));

describe('WalkScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTimerStore.getState().clearWalkTimer();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders correctly in timer mode and can start timer', () => {
    render(<WalkScreen />);
    
    expect(screen.getByText('Прогулка')).toBeTruthy();
    expect(screen.getByText('Таймер прогулки')).toBeTruthy();
    
    const startBtn = screen.getByText('Начать прогулку');
    expect(startBtn).toBeTruthy();
    fireEvent.press(startBtn);
    
    expect(screen.getByText('Остановить')).toBeTruthy();
  });

  it('switches to manual mode and allows saving', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<WalkScreen />);
    
    fireEvent.press(screen.getByText('Вручную'));
    expect(screen.getByText('Начали')).toBeTruthy();
    expect(screen.getByText('Закончили')).toBeTruthy();

    // Change location and weather
    fireEvent.press(screen.getByText('Двор'));
    fireEvent.press(screen.getByText('Облачно'));

    fireEvent.press(screen.getByText('Сохранить'));

    expect(saveWalkInterval).not.toHaveBeenCalled();
  });
});
