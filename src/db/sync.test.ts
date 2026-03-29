import { syncWithSupabase, getLastSyncedAt } from './sync';
import { synchronize } from '@nozbe/watermelondb/sync';

jest.mock('@nozbe/watermelondb/sync', () => ({
  synchronize: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./index', () => ({
  database: {
    get: jest.fn(),
  },
}));

describe('WatermelonDB SyncAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initially has no lastSyncedAt', () => {
    expect(getLastSyncedAt()).toBeNull();
  });

  it('calls synchronize with the exact config structure', async () => {
    (synchronize as jest.Mock).mockResolvedValueOnce(undefined);

    await syncWithSupabase();

    expect(synchronize).toHaveBeenCalledTimes(1);
    
    const callArgs = (synchronize as jest.Mock).mock.calls[0][0];
    expect(callArgs).toBeDefined();
    expect(callArgs.database).toBeDefined();
    expect(typeof callArgs.pullChanges).toBe('function');
    expect(typeof callArgs.pushChanges).toBe('function');
  });

  it('updates lastSyncedAt upon successful sync', async () => {
    // Mock system time to a known value
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));

    (synchronize as jest.Mock).mockResolvedValueOnce(undefined);

    await syncWithSupabase();

    expect(getLastSyncedAt()).toBe('2026-03-20T12:00:00.000Z');
    
    jest.useRealTimers();
  });

  it('throws and surfaces errors if synchronize fails', async () => {
    // Save previous sync state
    const previousSync = getLastSyncedAt();
    
    const error = new Error('Network error');
    (synchronize as jest.Mock).mockRejectedValueOnce(error);

    await expect(syncWithSupabase()).rejects.toThrow('Network error');

    // lastSyncedAt shouldn't be updated if it fails
    // (If it was null before, it should stay null)
    expect(getLastSyncedAt()).toBe(previousSync);
  });
});
