import { useDataStore } from './dataStore';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

describe('dataStore', () => {
  const initialState = { ...useDataStore.getState() };

  // Setup a fluent mock for supabase.from().select().eq().single() etc.
  const mockSupabaseQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useDataStore.setState(initialState, true);

    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery);

    (useAuthStore.getState as jest.Mock).mockReturnValue({
      activeParent: 'mom',
      baby: { id: 'baby-123' },
      setActiveParent: jest.fn(),
      setBaby: jest.fn(),
    });
  });

  it('has default initial state', () => {
    const state = useDataStore.getState();
    expect(state.feedings).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.selectedDate).toBeInstanceOf(Date);
  });

  describe('Loading Data', () => {
    it('loadDayData manages loading state and populates arrays', async () => {
      // Mock the promise returned by the initial supabase query
      mockSupabaseQuery.order.mockResolvedValueOnce({ data: [{ id: 'f1' }] }); // feedings
      mockSupabaseQuery.order.mockResolvedValueOnce({ data: [{ id: 's1' }] }); // sleeps
      mockSupabaseQuery.order.mockResolvedValueOnce({ data: [{ id: 'd1' }] }); // diapers
      mockSupabaseQuery.order.mockResolvedValueOnce({ data: [] }); // walks

      const promise = useDataStore.getState().loadDayData(new Date('2026-03-20T12:00:00Z'));
      
      // Right after calling, loading should be true
      expect(useDataStore.getState().loading).toBe(true);

      await promise;

      const state = useDataStore.getState();
      expect(state.loading).toBe(false);
      expect(state.feedings).toHaveLength(1);
      expect(state.sleeps).toHaveLength(1);
      expect(state.diapers).toHaveLength(1);
      expect(state.walks).toHaveLength(0);
    });

    it('setSelectedDate updates date and triggers loadDayData', () => {
      const spy = jest.spyOn(useDataStore.getState(), 'loadDayData').mockImplementation(async () => {});
      const date = new Date('2026-01-01');
      useDataStore.getState().setSelectedDate(date);
      
      expect(useDataStore.getState().selectedDate).toEqual(date);
      expect(spy).toHaveBeenCalledWith(date);
    });
  });

  describe('CRUD Operations', () => {
    it('addFeeding adds item to state and calls supabase', async () => {
      const mockFeeding = { type: 'breast' as const, created_at: '2026-03-20T12:00:00Z' };
      const returnedData = { id: 'new-f1', ...mockFeeding, recorded_by: 'mom' };
      
      mockSupabaseQuery.single.mockResolvedValueOnce({ data: returnedData, error: null });

      await useDataStore.getState().addFeeding(mockFeeding);

      expect(supabase.from).toHaveBeenCalledWith('feedings');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith([expect.objectContaining({ type: 'breast', recorded_by: 'mom' })]);
      
      const state = useDataStore.getState();
      expect(state.feedings).toContainEqual(returnedData);
    });

    it('deleteFeeding removes item from state', async () => {
      useDataStore.setState({ feedings: [{ id: 'f1', type: 'formula' } as any] });
      
      mockSupabaseQuery.eq.mockResolvedValueOnce({ error: null });

      await useDataStore.getState().deleteFeeding('f1');
      
      expect(supabase.from).toHaveBeenCalledWith('feedings');
      expect(mockSupabaseQuery.delete).toHaveBeenCalled();
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 'f1');
      
      expect(useDataStore.getState().feedings).toHaveLength(0);
    });
    
    it('transferShift updates active parent', async () => {
      mockSupabaseQuery.insert.mockResolvedValueOnce({ error: null });
      const setActiveParent = jest.fn();
      
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        activeParent: 'mom',
        setActiveParent,
      });

      await useDataStore.getState().transferShift();

      expect(supabase.from).toHaveBeenCalledWith('shifts');
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith([{ active_parent: 'dad' }]);
      expect(setActiveParent).toHaveBeenCalledWith('dad');
    });
  });
});
