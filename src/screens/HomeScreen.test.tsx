import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock FAB, as it has its own complex tests
jest.mock('../components/FAB', () => {
  const { View } = require('react-native');
  return () => <View testID="mock-fab" />;
});

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 месяц'),
}));

// Critical: Mock withObservables to bypass RxJS queries and inject static arrays
jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      feedings={[{ id: 'f1', created_at: Date.now(), type: 'breast', recorded_by: 'mom' }]} 
      sleeps={[]} 
      diapers={[]} 
      walks={[]} 
      tasks={[{ id: 't1', title: 'Buy diapers', is_completed: false, recorded_by: 'dad' }]} 
    />
  );
});

describe('HomeScreen', () => {
  const mockSetActiveParent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        baby: { name: 'Leo', birthdate: '2026-02-10' },
      activeParent: 'mom',
      setActiveParent: mockSetActiveParent,
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders baby name, age, and shift correctly', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Leo')).toBeTruthy();
    expect(screen.getByText('1 месяц')).toBeTruthy();
    expect(screen.getByText('Мама на смене')).toBeTruthy();
  });

  it('handles transfer shift', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Передать'));
    expect(mockSetActiveParent).toHaveBeenCalledWith('dad');
  });

  it('renders active tasks and allows adding new ones', async () => {
    // Mock database write
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    const mockCreate = jest.fn();
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<HomeScreen />);
    
    // Renders existing task from the HOC mock
    expect(screen.getByText('Buy diapers')).toBeTruthy();
    expect(screen.getByText('1 ост.')).toBeTruthy();

    // Add new task
    const input = screen.getByPlaceholderText('Напр. купить подгузники');
    fireEvent.changeText(input, 'Call doctor');
    
    // Let's submit via the onSubmitEditing on TextInput
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(database.get).toHaveBeenCalledWith('tasks');
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('navigates to quick cards correctly', () => {
    render(<HomeScreen />);
    
    fireEvent.press(screen.getByText('Сон')); // One of the quick cards
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Tracker', { screen: 'Sleep' });
  });
});
