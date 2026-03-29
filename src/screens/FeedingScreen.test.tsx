import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FeedingScreen from './FeedingScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

const mockNavigation = { goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.spyOn(Alert, 'alert');

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

describe('FeedingScreen', () => {
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

  it('renders correctly in breast mode', () => {
    render(<FeedingScreen />);
    
    expect(screen.getAllByText('Грудь').length).toBeGreaterThan(0);
    expect(screen.getByText('Левая')).toBeTruthy();
    expect(screen.getByText('Правая')).toBeTruthy();
  });

  it('switches to bottle mode and inputs amount', () => {
    render(<FeedingScreen />);
    
    fireEvent.press(screen.getByText('Бутылка'));
    expect(screen.getByText('Количество (мл/гр)')).toBeTruthy();

    const input = screen.getByPlaceholderText('0');
    fireEvent.changeText(input, '120');
    expect(input.props.value).toBe('120');
  });

  it('saves feeding correctly', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<FeedingScreen />);
    
    fireEvent.press(screen.getByText('Сохранить'));

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Сохранено!', 'Кормление успешно добавлено.');
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
