import { getAgeLabel, useAuthStore } from './authStore';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
  Session: {}
}));

describe('authStore Utils', () => {
  describe('getAgeLabel', () => {
    beforeAll(() => {
      // Mock system time to a fixed date: 2026-03-20T12:00:00Z
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-20T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('returns "—" when birthdate is empty', () => {
      expect(getAgeLabel('')).toBe('—');
    });

    it('returns "0 дн." when born today', () => {
      expect(getAgeLabel('2026-03-20T08:00:00Z')).toBe('0 дн.');
    });

    it('returns "5 дн." when born 5 days ago in the same month', () => {
      expect(getAgeLabel('2026-03-15T12:00:00Z')).toBe('5 дн.');
    });

    it('returns "1 мес." when born exactly 1 month ago', () => {
      // Note: 2026-02-20
      expect(getAgeLabel('2026-02-20T12:00:00Z')).toBe('1 мес.');
    });

    it('handles crossing a month boundary with remaining days', () => {
      // Born Jan 25, 2026 -> to Mar 20, 2026
      // Jan 25 to Feb 25 is 1 month. Feb 25 to Mar 20 is ~23 days.
      // Calculation in code: months = 2. days = 20 - 25 = -5.
      // -5 < 0 -> months = 1, days = -5 + (days in Feb 2026 = 28) = 23.
      expect(getAgeLabel('2026-01-25T12:00:00Z')).toBe('1 мес. · 23 дн.');
    });

    it('handles negative age (born in future)', () => {
      // If user inputs a future date by mistake
      // 2026-04-20
      // months = 3 - 4 = -1
      // days = 20 - 20 = 0 -> -1 мес.
      expect(getAgeLabel('2026-04-20T12:00:00Z')).toBe('-1 мес.');
    });
  });
});

describe('useAuthStore', () => {
  const initialState = { ...useAuthStore.getState() };

  afterEach(() => {
    useAuthStore.setState(initialState, true);
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.baby).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.onboardingNeeded).toBe(false);
    expect(state.activeParent).toBe('mom');
  });

  it('updates session', () => {
    const mockSession = { access_token: '123' } as any;
    useAuthStore.getState().setSession(mockSession);
    expect(useAuthStore.getState().session).toEqual(mockSession);
  });

  it('updates activeParent', () => {
    useAuthStore.getState().setActiveParent('dad');
    expect(useAuthStore.getState().activeParent).toBe('dad');
  });
});
