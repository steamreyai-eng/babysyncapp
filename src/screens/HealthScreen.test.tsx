import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HealthScreen from './HealthScreen';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';

jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      medications={[]} 
      growthRecords={[]}
    />
  );
});

jest.spyOn(Alert, 'alert');

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

describe('HealthScreen', () => {
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

  it('renders vitals tab default with temperature inputs', () => {
    render(<HealthScreen />);
    
    expect(screen.getByText('Здоровье')).toBeTruthy();
    expect(screen.getByText('Температура')).toBeTruthy();
    
    const input = screen.getByDisplayValue('36.6');
    fireEvent.changeText(input, '38.5');
    
    expect(screen.getByText('⚠️ Высокая — вызовите врача')).toBeTruthy();
  });

  it('switches to meds tab and allows adding medication', async () => {
    const mockCreate = jest.fn();
    jest.spyOn(database, 'write').mockImplementation(async (callback: any) => await callback());
    jest.spyOn(database, 'get').mockReturnValue({ create: mockCreate } as any);

    render(<HealthScreen />);
    
    fireEvent.press(screen.getByText('Лекарства'));
    
    // Toggle add form
    fireEvent.press(screen.getByTestId('add-med-btn'));
    expect(screen.getByText('Добавить лекарство')).toBeTruthy();
    
    // Add med
    fireEvent.changeText(screen.getByPlaceholderText('Название лекарства'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('Доза'), '2.5');
    
    fireEvent.press(screen.getByText('Сохранить лекарство'));
    
    await waitFor(() => {
      expect(database.write).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('✓', 'Лекарство добавлено');
    });
  });

  it('switches to symptoms tab and selects symptoms', () => {
    render(<HealthScreen />);
    
    fireEvent.press(screen.getByText('Симптомы'));
    
    expect(screen.getByText('Выберите симптомы')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Насморк'));
    fireEvent.press(screen.getByText('Сыпь'));
    
    expect(screen.getByText('2 выбрано')).toBeTruthy();
    
    fireEvent.changeText(screen.getByPlaceholderText('Подробности для педиатра...'), 'Red spots');
    
    fireEvent.press(screen.getByText('Сохранить и уведомить'));
    
    expect(Alert.alert).toHaveBeenCalled();
  });
});
