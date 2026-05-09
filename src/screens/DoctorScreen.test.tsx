import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DoctorScreen from './DoctorScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      doctorVisits={[]} 
      vaccinations={[]}
    />
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

describe('DoctorScreen', () => {
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

  it('renders visits tab by default and allows showing add form', () => {
    render(<DoctorScreen />);
    
    expect(screen.getByText('Врач')).toBeTruthy();
    expect(screen.getByText('📋 Посещения')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Добавить посещение'));
    
    expect(screen.getByPlaceholderText('Врач (Др. Смирнова)')).toBeTruthy();
  });

  it('creates a new visit successfully', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<DoctorScreen />);
    
    fireEvent.press(screen.getByText('Добавить посещение'));
    
    fireEvent.changeText(screen.getByPlaceholderText('Врач (Др. Смирнова)'), 'Dr. House');
    fireEvent.changeText(screen.getByPlaceholderText('Тип (Плановый осмотр)'), 'Routine');
    
    fireEvent.press(screen.getByText('Сохранить'));

    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('✓', 'Визит добавлен');
    });
  });

  it('switches to vaccines tab', () => {
    render(<DoctorScreen />);
    
    fireEvent.press(screen.getByText('💉 Прививки'));
    
    expect(screen.getByText('График прививок')).toBeTruthy();
    expect(screen.getByText('При рождении')).toBeTruthy();
  });
});
