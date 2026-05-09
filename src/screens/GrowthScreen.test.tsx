import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GrowthScreen from './GrowthScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      growthRecords={[]}
    />
  );
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(JSON.stringify({ 'Улыбается людям': true })),
  setItem: jest.fn().mockResolvedValue(true),
}));

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

describe('GrowthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      baby: { birthdate: "2026-01-01" },
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders correctly and shows milestones', async () => {
    render(<GrowthScreen />);
    
    expect(screen.getByText('Рост и развитие')).toBeTruthy();
    expect(screen.getByText('Перцентили ВОЗ')).toBeTruthy();
    
    // Check if the loaded active milestone is present (test async storage mock resolves)
    await waitFor(() => {
        expect(screen.getByText('Улыбается людям')).toBeTruthy();
    });
  });

  it('allows saving new measurements', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<GrowthScreen />);
    
    fireEvent.press(screen.getAllByText('Выбрать ↕')[0]);
    fireEvent.changeText(screen.getByDisplayValue('6.0'), '5.5');
    
    fireEvent.press(screen.getByText('✓ Добавить'));

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
