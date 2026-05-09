import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OnboardingScreen from './OnboardingScreen';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
}));

jest.mock('../components/DateTimePickerModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ visible, onChange, onClose }: any) => visible ? (
    <Text onPress={() => { onChange(new Date('2026-01-01T12:00:00Z')); onClose(); }}>
      mock-date-picker
    </Text>
  ) : null;
});

jest.spyOn(Alert, 'alert');

describe('OnboardingScreen', () => {
  const mockSetOnboardingNeeded = jest.fn();
  const mockSetBaby = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        setOnboardingNeeded: mockSetOnboardingNeeded,
      setBaby: mockSetBaby,
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders step 1 and validates empty fields', () => {
    render(<OnboardingScreen />);
    
    expect(screen.getByText('Шаг 1 из 4')).toBeTruthy();
    expect(screen.getByText('Как зовут малыша?')).toBeTruthy();

    fireEvent.press(screen.getByText('Далее'));
    expect(Alert.alert).toHaveBeenCalledWith('Внимание', 'Введите имя малыша');
  });

  it('progresses through steps and completes onboarding', async () => {
    const mockSupabaseQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ error: null, data: { id: 'baby-id', name: 'Alina' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery);

    render(<OnboardingScreen />);

    // Step 1
    fireEvent.changeText(screen.getByPlaceholderText('Например: Миша'), 'Alina');
    fireEvent.press(screen.getByText('Девочка'));
    fireEvent.press(screen.getByText('Далее'));

    // Step 2
    expect(screen.getByText('Шаг 2 из 4')).toBeTruthy();
    fireEvent.press(screen.getByText('Выберите дату'));
    fireEvent.press(screen.getByText('mock-date-picker'));
    fireEvent.press(screen.getByText('Далее'));

    // Step 3
    expect(screen.getByText('Шаг 3 из 4')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Страна'), 'Russia');
    fireEvent.press(screen.getByText('Далее'));

    // Step 4
    expect(screen.getByText('Шаг 4 из 4')).toBeTruthy();
    // Pre-filled with Мама / Папа
    fireEvent.changeText(screen.getByPlaceholderText('Имя мамы'), 'Mom');
    fireEvent.changeText(screen.getByPlaceholderText('Имя папы'), 'Dad');
    
    // Complete
    fireEvent.press(screen.getByText('Начать использование'));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('baby_profile');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith([expect.objectContaining({
        name: 'Alina',
        birthdate: '2026-01-01',
        country: 'Russia',
        city: '',
        mom_name: 'Mom',
        dad_name: 'Dad',
        gender: 'girl',
        user_id: 'user-1',
      })]);
      expect(mockSetBaby).toHaveBeenCalledWith({ id: 'baby-id', name: 'Alina' });
      expect(mockSetOnboardingNeeded).toHaveBeenCalledWith(false);
    });
  });
});
