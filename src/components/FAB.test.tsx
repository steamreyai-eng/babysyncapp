import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import FAB from './FAB';
import { useAuthStore } from '../store/authStore';
import { database } from '../db';
import { Alert } from 'react-native';

// Mock Dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useNavigationState: jest.fn((selector) => selector({
    index: 0,
    routes: [{ name: 'Home' }],
  })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Expo Linear gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('../db', () => ({
  database: {
    write: jest.fn((callback) => callback()),
    get: jest.fn(() => ({
      create: jest.fn(),
    })),
  },
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('FAB Component UI & Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default authStore mock behavior
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        session: { user: { id: 'user_123' } },
        activeParent: 'mom'
      };
      return selector(state);
    });
  });

  it('renders main FAB button by default', () => {
    render(<FAB />);
    expect(screen.getByTestId('fab-main-button')).toBeTruthy();
  });

  it('expands menu when FAB is pressed', () => {
    const { queryByText, getByTestId, getByText } = render(<FAB />);
    
    expect(queryByText('Кормление')).toBeNull();

    const mainFab = getByTestId('fab-main-button');
    fireEvent.press(mainFab);

    expect(getByText('Кормление')).toBeTruthy();
    expect(getByText('Подгузник')).toBeTruthy();
    expect(getByText('Сон')).toBeTruthy();
    expect(getByText('Прогулка')).toBeTruthy();
  });
  
  it('opens Feeding sheet when Feeding quick-action is pressed', async () => {
    const { getByTestId, getByText, queryByText } = render(<FAB />);
    
    // Open menu
    fireEvent.press(getByTestId('fab-main-button'));
    
    // Press feeding item
    fireEvent.press(getByTestId('fab-item-feeding'));
    
    expect(getByText('Новое кормление')).toBeTruthy();
  });
});
