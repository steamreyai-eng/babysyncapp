export type IntervalSegment = {
  startMs: number;
  endMs: number;
  durationSeconds: number;
};

export function splitIntervalByLocalDay(startMs: number, endMs: number): IntervalSegment[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }

  const segments: IntervalSegment[] = [];
  let cursor = startMs;

  while (cursor < endMs) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);

    const segmentEnd = Math.min(endMs, nextMidnight.getTime());
    const durationSeconds = Math.max(1, Math.round((segmentEnd - cursor) / 1000));

    segments.push({
      startMs: cursor,
      endMs: segmentEnd,
      durationSeconds,
    });

    cursor = segmentEnd;
  }

  return segments;
}
