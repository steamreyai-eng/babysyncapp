import { Q } from '@nozbe/watermelondb';
import { database, generateUUID } from '../db';
import { Sleep } from '../db/models/Sleep';
import { Walk } from '../db/models/Walk';
import { getCurrentUserId, resolveBabyId } from '../db/syncHelpers';
import { splitIntervalByLocalDay, type IntervalSegment as Segment } from './intervalSplit';

export { splitIntervalByLocalDay };

type RecordMeta = {
  recordedBy?: string | null;
  babyId?: string | null;
  userId?: string | null;
};

type ResolvedMeta = {
  recordedBy: string;
  babyId: string | null;
  userId: string | null;
};

export type SleepIntervalInput = RecordMeta & {
  startMs: number;
  endMs: number;
  location?: string | null;
  quality?: number | null;
  isSynthetic?: boolean | null;
  groupId?: string | null;
};

export type WalkIntervalInput = RecordMeta & {
  startMs: number;
  endMs: number;
  location?: string | null;
  weather?: string | null;
  notes?: string | null;
  distanceM?: number | null;
  groupId?: string | null;
};

async function resolveMeta(input: RecordMeta): Promise<ResolvedMeta> {
  const babyId = input.babyId === undefined ? await resolveBabyId() : input.babyId;
  const userId = input.userId === undefined ? getCurrentUserId() : input.userId;

  return {
    recordedBy: input.recordedBy || 'mom',
    babyId: babyId || null,
    userId: userId || null,
  };
}

function setSleepFields(sleep: Sleep, segment: Segment, input: SleepIntervalInput, meta: ResolvedMeta, groupId: string) {
  sleep.duration_seconds = segment.durationSeconds;
  sleep.location = input.location || 'crib';
  sleep.quality = input.quality || 0;
  sleep.start_time = segment.startMs;
  sleep.end_time = segment.endMs;
  sleep.created_at = segment.startMs;
  sleep.recorded_by = meta.recordedBy;
  sleep.group_id = groupId;
  if (input.isSynthetic != null) sleep.is_synthetic = input.isSynthetic;
  if (meta.babyId) sleep.baby_id = meta.babyId;
  if (meta.userId) sleep.user_id = meta.userId;
}

function setWalkFields(walk: Walk, segment: Segment, input: WalkIntervalInput, meta: ResolvedMeta, groupId: string, distanceM?: number | null) {
  walk.duration_seconds = segment.durationSeconds;
  walk.location = input.location || 'park';
  walk.weather = input.weather || 'sunny';
  walk.notes = input.notes?.trim() || undefined;
  walk.created_at = segment.startMs;
  walk.recorded_by = meta.recordedBy;
  walk.group_id = groupId;
  walk.distance_m = distanceM != null && Number.isFinite(distanceM) ? distanceM : undefined;
  if (meta.babyId) walk.baby_id = meta.babyId;
  if (meta.userId) walk.user_id = meta.userId;
}

async function fetchSleepGroup(record: Sleep) {
  if (!record.group_id) return [record];
  const records = await database.get<Sleep>('sleeps').query(Q.where('group_id', record.group_id)).fetch();
  return records.length > 0 ? records : [record];
}

async function fetchWalkGroup(record: Walk) {
  if (!record.group_id) return [record];
  const records = await database.get<Walk>('walks').query(Q.where('group_id', record.group_id)).fetch();
  return records.length > 0 ? records : [record];
}

export async function saveSleepInterval(input: SleepIntervalInput) {
  const segments = splitIntervalByLocalDay(input.startMs, input.endMs);
  if (segments.length === 0) return [];

  const meta = await resolveMeta(input);
  const groupId = input.groupId || generateUUID();
  const created: Sleep[] = [];

  await database.write(async () => {
    for (const segment of segments) {
      const record = await database.get<Sleep>('sleeps').create(sleep => {
        setSleepFields(sleep, segment, input, meta, groupId);
      });
      created.push(record);
    }
  });

  return created;
}

export async function replaceSleepRecordWithInterval(record: Sleep, input: SleepIntervalInput) {
  const segments = splitIntervalByLocalDay(input.startMs, input.endMs);
  if (segments.length === 0) return [];

  const meta = await resolveMeta({
    recordedBy: input.recordedBy || record.recorded_by,
    babyId: input.babyId === undefined ? record.baby_id : input.babyId,
    userId: input.userId === undefined ? record.user_id : input.userId,
  });
  const groupId = input.groupId || record.group_id || generateUUID();
  const relatedRecords = await fetchSleepGroup(record);
  const created: Sleep[] = [];

  await database.write(async () => {
    if (segments.length === 1 && relatedRecords.length === 1) {
      await record.update(sleep => {
        setSleepFields(sleep as Sleep, segments[0], input, meta, groupId);
      });
      created.push(record);
      return;
    }

    for (const relatedRecord of relatedRecords) {
      await relatedRecord.markAsDeleted();
    }
    for (const segment of segments) {
      const newRecord = await database.get<Sleep>('sleeps').create(sleep => {
        setSleepFields(sleep, segment, input, meta, groupId);
      });
      created.push(newRecord);
    }
  });

  return created;
}

export async function saveWalkInterval(input: WalkIntervalInput) {
  const segments = splitIntervalByLocalDay(input.startMs, input.endMs);
  if (segments.length === 0) return [];

  const meta = await resolveMeta(input);
  const totalDuration = input.endMs - input.startMs;
  const groupId = input.groupId || generateUUID();
  const created: Walk[] = [];

  await database.write(async () => {
    for (const segment of segments) {
      const distanceM = input.distanceM == null
        ? undefined
        : input.distanceM * ((segment.endMs - segment.startMs) / totalDuration);

      const record = await database.get<Walk>('walks').create(walk => {
        setWalkFields(walk, segment, input, meta, groupId, distanceM);
      });
      created.push(record);
    }
  });

  return created;
}

export async function replaceWalkRecordWithInterval(record: Walk, input: WalkIntervalInput) {
  const segments = splitIntervalByLocalDay(input.startMs, input.endMs);
  if (segments.length === 0) return [];

  const meta = await resolveMeta({
    recordedBy: input.recordedBy || record.recorded_by,
    babyId: input.babyId === undefined ? record.baby_id : input.babyId,
    userId: input.userId === undefined ? record.user_id : input.userId,
  });
  const totalDuration = input.endMs - input.startMs;
  const groupId = input.groupId || record.group_id || generateUUID();
  const relatedRecords = await fetchWalkGroup(record);
  const currentGroupDistance = relatedRecords.reduce((sum, item) => sum + (item.distance_m || 0), 0);
  const distanceM = relatedRecords.length > 1 && input.distanceM === record.distance_m
    ? currentGroupDistance || input.distanceM
    : input.distanceM;
  const created: Walk[] = [];

  await database.write(async () => {
    if (segments.length === 1 && relatedRecords.length === 1) {
      await record.update(walk => {
        setWalkFields(walk as Walk, segments[0], input, meta, groupId, distanceM);
      });
      created.push(record);
      return;
    }

    for (const relatedRecord of relatedRecords) {
      await relatedRecord.markAsDeleted();
    }
    for (const segment of segments) {
      const segmentDistanceM = distanceM == null
        ? undefined
        : distanceM * ((segment.endMs - segment.startMs) / totalDuration);

      const newRecord = await database.get<Walk>('walks').create(walk => {
        setWalkFields(walk, segment, input, meta, groupId, segmentDistanceM);
      });
      created.push(newRecord);
    }
  });

  return created;
}
