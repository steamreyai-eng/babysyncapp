import { useAppDatabase } from './hooks';
import { useDatabase } from '@nozbe/watermelondb/hooks';

jest.mock('@nozbe/watermelondb/hooks', () => ({
  useDatabase: jest.fn(),
}));

describe('Database Hooks', () => {
  it('useAppDatabase returns the context database', () => {
    const mockDbInstance = { collections: {} };
    (useDatabase as jest.Mock).mockReturnValue(mockDbInstance);

    const db = useAppDatabase();

    expect(useDatabase).toHaveBeenCalledTimes(1);
    expect(db).toBe(mockDbInstance);
  });
});
