import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AuthScreen from './AuthScreen';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

jest.spyOn(Alert, 'alert');

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login toggle correctly', () => {
    render(<AuthScreen />);
    
    // Default is Login mode
    expect(screen.getByText('Войти')).toBeTruthy();
    expect(screen.getByText('Нет аккаунта? Зарегистрируйтесь')).toBeTruthy();
    
    // Switch to Sign Up
    fireEvent.press(screen.getByText('Нет аккаунта? Зарегистрируйтесь'));
    
    expect(screen.getByText('Создать аккаунт')).toBeTruthy();
    expect(screen.getByText('Уже есть аккаунт? Войти')).toBeTruthy();
  });

  it('shows alert if fields are empty on submit', () => {
    render(<AuthScreen />);
    
    fireEvent.press(screen.getByText('Войти'));
    
    expect(Alert.alert).toHaveBeenCalledWith('Ошибка', 'Введите email и пароль');
  });

  it('calls signInWithPassword correctly in login mode', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
    
    render(<AuthScreen />);
    
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    
    fireEvent.press(screen.getByText('Войти'));

    expect(screen.getByText('Загрузка...')).toBeTruthy();
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('calls signUp correctly in sign up mode', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ error: null });
    
    render(<AuthScreen />);
    
    // Switch to Sign Up
    fireEvent.press(screen.getByText('Нет аккаунта? Зарегистрируйтесь'));
    
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test2@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password1234');
    
    fireEvent.press(screen.getByText('Создать аккаунт'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test2@example.com',
        password: 'password1234',
      });
      expect(Alert.alert).toHaveBeenCalledWith('Успешно', 'Проверьте почту для подтверждения');
    });
  });
});
