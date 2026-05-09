import { splitIntervalByLocalDay } from './intervalSplit';

describe('splitIntervalByLocalDay', () => {
  it('splits an overnight interval at local midnight', () => {
    const start = new Date(2026, 4, 6, 19, 30).getTime();
    const end = new Date(2026, 4, 7, 7, 30).getTime();

    const segments = splitIntervalByLocalDay(start, end);

    expect(segments).toHaveLength(2);
    expect(segments[0].startMs).toBe(start);
    expect(segments[0].endMs).toBe(new Date(2026, 4, 7, 0, 0).getTime());
    expect(segments[0].durationSeconds).toBe(4.5 * 60 * 60);
    expect(segments[1].startMs).toBe(new Date(2026, 4, 7, 0, 0).getTime());
    expect(segments[1].endMs).toBe(end);
    expect(segments[1].durationSeconds).toBe(7.5 * 60 * 60);
  });

  it('keeps a same-day interval as one segment', () => {
    const start = new Date(2026, 4, 7, 9, 0).getTime();
    const end = new Date(2026, 4, 7, 10, 15).getTime();

    expect(splitIntervalByLocalDay(start, end)).toEqual([
      { startMs: start, endMs: end, durationSeconds: 75 * 60 },
    ]);
  });

  it('rejects empty or reversed intervals', () => {
    const now = Date.now();

    expect(splitIntervalByLocalDay(now, now)).toEqual([]);
    expect(splitIntervalByLocalDay(now, now - 1)).toEqual([]);
  });
});
