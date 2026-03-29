import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AIScreen from './AIScreen';
import { useAuthStore } from '../store/authStore';
import { callAI } from '../lib/ai';
import { database } from '../db';

jest.mock('../lib/ai', () => ({
  callAI: jest.fn().mockResolvedValue('Mocked AI Response'),
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
  getAgeLabel: jest.fn().mockReturnValue('1 month'),
}));

describe('AIScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        baby: { name: 'Alina', birthdate: '2026-01-01' },
      };
      return selector ? selector(state) : state;
    });
    jest.spyOn(database, 'get').mockReturnValue({
      query: () => ({ fetch: jest.fn().mockResolvedValue([]) })
    } as any);
  });

  it('renders correctly and allows sending a message', async () => {
    render(<AIScreen />);
    
    expect(screen.getByText('AI Ассистент')).toBeTruthy();
    expect(screen.getByPlaceholderText('Задайте вопрос...')).toBeTruthy();
    
    const input = screen.getByPlaceholderText('Задайте вопрос...');
    fireEvent.changeText(input, 'Привет, как дела?');
    
    // Send message using the send button
    // It's a TouchableOpacity without text, we can simulate `onSubmitEditing`
    fireEvent(input, 'submitEditing');

    expect(screen.getByText('Привет, как дела?')).toBeTruthy();
    
    await waitFor(() => {
      expect(callAI).toHaveBeenCalled();
      expect(screen.getByText('Mocked AI Response')).toBeTruthy();
    });
  });

  it('allows clicking quick actions', async () => {
    render(<AIScreen />);
    
    const quickBtn = screen.getByText('📊 Анализ дня');
    fireEvent.press(quickBtn);

    expect(screen.getByText('Проанализируй данные за сегодня и дай рекомендации.')).toBeTruthy();

    await waitFor(() => {
      expect(callAI).toHaveBeenCalled();
    });
  });
});
