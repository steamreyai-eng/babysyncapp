import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from './SettingsScreen';
import { exportDataAsJSON } from '../lib/exportData';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

jest.mock('../lib/exportData', () => ({
  exportDataAsJSON: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: jest.fn() }
  }
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('true'),
  setItem: jest.fn(),
}));

jest.spyOn(Alert, 'alert');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('SettingsScreen', () => {
  const mockSetSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      setSession: mockSetSession,
      baby: { name: "Alina", mom_name: "Anna", dad_name: "Bob" },
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders correctly and shows privacy policy', async () => {
    render(<SettingsScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Настройки')).toBeTruthy();
      expect(screen.getByText('Alina')).toBeTruthy();
    });
    expect(screen.getByText('Anna')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Политика конфиденциальности'));
  });

  it('triggers JSON export', async () => {
    render(<SettingsScreen />);
    
    await waitFor(() => expect(screen.getByText('Экспорт данных')).toBeTruthy());
    
    await act(async () => {
      fireEvent.press(screen.getByText('Экспорт данных'));
    });
    expect(exportDataAsJSON).toHaveBeenCalled();
  });

  it('allows sign out', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    render(<SettingsScreen />);
    
    await waitFor(() => expect(screen.getByText('Выйти из аккаунта')).toBeTruthy());
    
    await act(async () => {
      fireEvent.press(screen.getByText('Выйти из аккаунта'));
    });
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockSetSession).toHaveBeenCalledWith(null);
  });
});
