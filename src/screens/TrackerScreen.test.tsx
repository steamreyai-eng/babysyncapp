import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TrackerScreen from './TrackerScreen';

const mockNavigation = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock withObservables to inject static props
jest.mock('@nozbe/with-observables', () => {
  return () => (Component: any) => (props: any) => (
    <Component 
      {...props} 
      feedings={[]} 
      sleeps={[]} 
      diapers={[]} 
      walks={[]} 
      growthRecords={[]} 
    />
  );
});

describe('TrackerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all quick access cards', () => {
    render(<TrackerScreen />);
    
    expect(screen.getByText('Трекер')).toBeTruthy();
    expect(screen.getByText('Кормление')).toBeTruthy();
    expect(screen.getByText('Сон')).toBeTruthy();
    expect(screen.getByText('Подгузник')).toBeTruthy();
    expect(screen.getByText('Здоровье')).toBeTruthy();
    expect(screen.getByText('Рост')).toBeTruthy();
    expect(screen.getByText('Смены')).toBeTruthy();
    expect(screen.getByText('Прогулка')).toBeTruthy();
    expect(screen.getByText('Врач')).toBeTruthy();
  });

  it('navigates to specific tracker sub-screens on press', () => {
    render(<TrackerScreen />);
    
    fireEvent.press(screen.getByText('Сон'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Sleep');

    fireEvent.press(screen.getByText('Кормление'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Feeding');
  });

  it('displays "Нет данных" when collections are empty', () => {
    render(<TrackerScreen />);
    
    // Since we mocked all arrays as empty, "Нет данных" should be visible multiple times
    const noDataLabels = screen.queryAllByText('Нет данных');
    expect(noDataLabels.length).toBeGreaterThan(0);
  });
});
