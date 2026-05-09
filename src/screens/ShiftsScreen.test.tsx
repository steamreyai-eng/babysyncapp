import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ShiftsScreen from './ShiftsScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      feedings={[]} 
      sleeps={[]} 
      diapers={[]} 
      shiftsData={[]}
      tasks={[{ id: 't1', title: 'Test Task', is_completed: false, recorded_by: 'mom', update: jest.fn(), markAsDeleted: jest.fn() }]}
    />
  );
});

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

describe('ShiftsScreen', () => {
  const mockSetActiveParent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        session: { user: { id: 'user-1' } },
      activeParent: 'mom',
      setActiveParent: mockSetActiveParent,
      baby: { mom_name: "Anna", dad_name: "Bob" },
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders parents and allows switching active parent', () => {
    render(<ShiftsScreen />);
    
    expect(screen.getByText('Смены родителей')).toBeTruthy();
    expect(screen.getByText('СЕЙЧАС АКТИВЕН')).toBeTruthy();
    expect(screen.getByText('Anna')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Передать →'));
    expect(mockSetActiveParent).toHaveBeenCalledWith('dad');
  });

  it('renders tasks and allows adding a task', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<ShiftsScreen />);
    
    expect(screen.getByText('Test Task')).toBeTruthy();
    
    fireEvent.changeText(screen.getByPlaceholderText('Напр. дать витамин Д'), 'New Task');
    
    // There isn't text in add button, but we can submit via submitEditing on input:
    fireEvent(screen.getByPlaceholderText('Напр. дать витамин Д'), 'submitEditing');

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
