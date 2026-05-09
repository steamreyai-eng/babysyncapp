import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DiaperScreen from './DiaperScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component {...props} diapers={[]} />
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

describe('DiaperScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders content correctly', () => {
    render(<DiaperScreen />);
    
    expect(screen.getByText('Подгузники')).toBeTruthy();
    expect(screen.getByText('Мокрый')).toBeTruthy();
    expect(screen.getByText('Грязный')).toBeTruthy();
    expect(screen.getByText('Оба')).toBeTruthy();
  });

  it('allows changing diaper type and notes', () => {
    render(<DiaperScreen />);
    
    // Switch type
    fireEvent.press(screen.getByText('Грязный'));
    
    // Add notes
    const input = screen.getByPlaceholderText('Дополнительные заметки...');
    fireEvent.changeText(input, 'Rash observed');
    
    expect(input.props.value).toBe('Rash observed');
  });

  it('saves diaper successfully', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<DiaperScreen />);
    
    fireEvent.press(screen.getByText('Оба'));
    fireEvent.press(screen.getByText('Сохранить подгузник'));

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(screen.getByText('Сохранено!')).toBeTruthy();
    });
  });
});
