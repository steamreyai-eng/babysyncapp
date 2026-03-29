import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RoutineScreen from './RoutineScreen';
import { useAuthStore } from '../store/authStore';
import { useRoutineEngine } from '../hooks/useRoutineEngine';
import { useRituals } from '../hooks/useRituals';
import { database } from '../db';

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn((selector) => { const state = { session: { user: { id: 'test-user' } }, activeParent: 'mom' }; return selector ? selector(state) : state; }),
}));

jest.mock('../hooks/useRoutineEngine', () => ({
  useRoutineEngine: jest.fn(),
}));

jest.mock('../hooks/useRituals', () => ({
  useRituals: jest.fn(),
}));

jest.mock('../db', () => ({
  database: {
    get: jest.fn().mockReturnValue({
      query: () => ({
        fetch: jest.fn().mockResolvedValue([]),
      })
    })
  }
}));

describe('RoutineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        baby: { name: 'Alina', birthdate: '2026-01-01' },
      };
      return selector ? selector(state) : state;
    });

    (useRoutineEngine as jest.Mock).mockReturnValue({
      leapInfo: { status: 'none', leap: null },
      norms: { ageLabel: '2 месяца', wakeWindowMin: [60, 90], totalSleepH: 15, napsCount: '4-5', feedsPerDay: '8-10', specificActions: [] },
      adaptations: ['test adaptation'],
      ageWeeks: 8,
      ageMo: 2,
      sources: ['TEST SOURCE'],
      schedule: [],
      bedtimeRitual: { ageRange: '0-3', steps: [], anchorPhrase: 'Спи моя радость' },
      morningRitual: { ageRange: '0-3', steps: [] },
    });

    (useRituals as jest.Mock).mockReturnValue({
      rituals: [],
      logs: [],
      addRitual: jest.fn(),
      updateRitual: jest.fn(),
      deleteRitual: jest.fn(),
      startRitual: jest.fn(),
      completeStep: jest.fn(),
      finishRitual: jest.fn(),
      getCompletionRate: jest.fn().mockReturnValue(75),
      getLastLog: jest.fn().mockReturnValue(null),
    });
  });

  it('renders root view and default Status tab', () => {
    render(<RoutineScreen />);
    
    expect(screen.getByText('Режим')).toBeTruthy();
    expect(screen.getByText('🧒 Статус')).toBeTruthy();
    expect(screen.getByText('🌙 Ритуалы')).toBeTruthy();
    expect(screen.getByText('📅 План')).toBeTruthy();
    
    // Content of status dashboard
    expect(screen.getByText('2 мес 0 дн')).toBeTruthy();
    expect(screen.getByText('Анализ недели')).toBeTruthy();
  });

  it('switches to Rituals tab', () => {
    render(<RoutineScreen />);
    
    fireEvent.press(screen.getByText('🌙 Ритуалы'));
    
    // Bedtime ritual injected by engine should be visible
    expect(screen.getByText('Вечерний (0-3)')).toBeTruthy();
    expect(screen.getByText('ФРАЗА-ЯКОРЬ НА НОЧЬ')).toBeTruthy();
    expect(screen.getByText('«Спи моя радость»')).toBeTruthy();
  });

  it('switches to Schedule tab', () => {
    render(<RoutineScreen />);
    
    fireEvent.press(screen.getByText('📅 План'));
    
    // Schedule generic components
    expect(screen.getByText('Окна бодрствования: 60–90 мин')).toBeTruthy();
    expect(screen.getByText('☀️ Время подъёма')).toBeTruthy();
    expect(screen.getByText('07:00')).toBeTruthy();
  });
});
