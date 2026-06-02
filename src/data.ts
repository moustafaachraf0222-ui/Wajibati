import { Capacitor } from '@capacitor/core';
import type { PlatformData, PushTokenRecord, SharedDataSnapshot } from './types';
import { secondaryStreams, uniqueStrings } from './education';
import { DATA_KEY, REMOTE_STATE_ENDPOINT } from './data-constants';
import { applyDeletionTombstones, purgeExpiredTrashedSchools } from './data-tombstones';

export * from './data-access';
export * from './data-account-edit';
export * from './data-constants';
export * from './data-identifiers';
export * from './data-preferences';
export * from './data-tombstones';

const seedData: PlatformData = {
  schools: [],
  users: [
    {
      id: 'user-admin',
      name: 'Administrator',
      email: 'wajibati@admin.dz',
      password: 'LATTOUI1qaz0plm@7',
      role: 'admin',
      status: 'active'
    }
  ],
  exercises: [],
  announcements: [],
  notes: [],
  completions: {},
  completionDates: {},
  feedback: {},
  pushTokens: {},
  deletedSchoolIds: [],
  deletedExerciseIds: [],
  deletedNoteIds: [],
  settings: {
    allowExerciseImages: true,
    maintenanceMode: false
  }
};

export function cloneSeedData(): PlatformData {
  return JSON.parse(JSON.stringify(seedData)) as PlatformData;
}

export function upsertPushToken(data: PlatformData, userId: string, token: string): PlatformData {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return data;
  }

  const nextRecord: PushTokenRecord = {
    token: trimmedToken,
    platform: Capacitor.getPlatform(),
    updatedAt: new Date().toISOString()
  };
  const currentTokens = data.pushTokens[userId] ?? [];
  const nextTokens = [nextRecord, ...currentTokens.filter((record) => record.token !== trimmedToken)].slice(0, 5);

  return {
    ...data,
    pushTokens: {
      ...data.pushTokens,
      [userId]: nextTokens
    }
  };
}

export function normalizePlatformData(value: Partial<PlatformData> | null | undefined): PlatformData {
  const fallback = cloneSeedData();
  const source = value ?? {};

  const normalized = {
    ...fallback,
    ...source,
    schools: Array.isArray(source.schools)
      ? source.schools.map((school) =>
          school.stage === 'secondary' && (!Array.isArray(school.streams) || school.streams.length === 0)
            ? { ...school, streams: [...secondaryStreams] }
            : school
        )
      : fallback.schools,
    users: Array.isArray(source.users) ? source.users : fallback.users,
    exercises: Array.isArray(source.exercises) ? source.exercises : fallback.exercises,
    announcements: Array.isArray(source.announcements) ? source.announcements : fallback.announcements,
    notes: Array.isArray(source.notes) ? source.notes : fallback.notes,
    completions: source.completions && typeof source.completions === 'object' ? source.completions : fallback.completions,
    completionDates:
      source.completionDates && typeof source.completionDates === 'object' ? source.completionDates : fallback.completionDates,
    feedback: source.feedback && typeof source.feedback === 'object' ? source.feedback : fallback.feedback,
    pushTokens: source.pushTokens && typeof source.pushTokens === 'object' ? source.pushTokens : fallback.pushTokens,
    deletedSchoolIds: Array.isArray(source.deletedSchoolIds) ? uniqueStrings(source.deletedSchoolIds.filter((id): id is string => typeof id === 'string')) : fallback.deletedSchoolIds,
    deletedExerciseIds: Array.isArray(source.deletedExerciseIds)
      ? uniqueStrings(source.deletedExerciseIds.filter((id): id is string => typeof id === 'string'))
      : fallback.deletedExerciseIds,
    deletedNoteIds: Array.isArray(source.deletedNoteIds)
      ? uniqueStrings(source.deletedNoteIds.filter((id): id is string => typeof id === 'string'))
      : fallback.deletedNoteIds,
    settings: {
      ...fallback.settings,
      ...(source.settings ?? {})
    }
  };

  return applyDeletionTombstones(purgeExpiredTrashedSchools(normalized));
}

export async function fetchSharedData(): Promise<SharedDataSnapshot | null> {
  if (window.location.protocol === 'file:' && !REMOTE_STATE_ENDPOINT.startsWith('http')) {
    return null;
  }

  const response = await fetch(REMOTE_STATE_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Shared data request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { data?: PlatformData; updatedAt?: string | null };
  return {
    data: normalizePlatformData(payload.data),
    updatedAt: payload.updatedAt ?? null
  };
}

export async function fetchSharedDataUpdatedAt(): Promise<string | null> {
  if (window.location.protocol === 'file:' && !REMOTE_STATE_ENDPOINT.startsWith('http')) {
    return null;
  }

  const separator = REMOTE_STATE_ENDPOINT.includes('?') ? '&' : '?';
  const response = await fetch(`${REMOTE_STATE_ENDPOINT}${separator}meta=1`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Shared data metadata request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { updatedAt?: string | null };
  return payload.updatedAt ?? null;
}

export async function saveSharedData(data: PlatformData): Promise<SharedDataSnapshot | null> {
  if (window.location.protocol === 'file:' && !REMOTE_STATE_ENDPOINT.startsWith('http')) {
    return null;
  }

  const response = await fetch(REMOTE_STATE_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    throw new Error(`Shared data save failed with ${response.status}`);
  }

  const payload = (await response.json()) as { data?: PlatformData; updatedAt?: string | null };
  return {
    data: normalizePlatformData(payload.data ?? data),
    updatedAt: payload.updatedAt ?? null
  };
}

export function mergeDeletionTombstones(baseData: PlatformData, sourceData: PlatformData): PlatformData {
  return applyDeletionTombstones({
    ...baseData,
    deletedSchoolIds: uniqueStrings([...baseData.deletedSchoolIds, ...sourceData.deletedSchoolIds]),
    deletedExerciseIds: uniqueStrings([...baseData.deletedExerciseIds, ...sourceData.deletedExerciseIds]),
    deletedNoteIds: uniqueStrings([...baseData.deletedNoteIds, ...sourceData.deletedNoteIds])
  });
}

export function hasUserData(data: PlatformData) {
  return (
    data.schools.length > 0 ||
    data.users.length > 1 ||
    data.exercises.length > 0 ||
    data.announcements.length > 0 ||
    data.notes.length > 0 ||
    data.deletedSchoolIds.length > 0 ||
    data.deletedExerciseIds.length > 0 ||
    data.deletedNoteIds.length > 0 ||
    Object.keys(data.completions).length > 0 ||
    Object.keys(data.completionDates).length > 0 ||
    Object.keys(data.feedback).length > 0
  );
}

export function isSeedOnlyData(data: PlatformData) {
  return (
    data.schools.length === 0 &&
    data.exercises.length === 0 &&
    data.announcements.length === 0 &&
    data.notes.length === 0 &&
    data.users.length === 1 &&
    data.users[0]?.id === seedData.users[0].id &&
    data.deletedSchoolIds.length === 0 &&
    data.deletedExerciseIds.length === 0 &&
    data.deletedNoteIds.length === 0 &&
    Object.keys(data.completions).length === 0 &&
    Object.keys(data.completionDates).length === 0 &&
    Object.keys(data.feedback).length === 0
  );
}

export async function promoteLocalDataIfRemoteIsEmpty(sharedData: PlatformData, localData: PlatformData) {
  if (isSeedOnlyData(sharedData) && hasUserData(localData)) {
    await saveSharedData(localData);
    return localData;
  }

  const mergedData = mergeDeletionTombstones(sharedData, localData);
  if (
    mergedData.deletedSchoolIds.length !== sharedData.deletedSchoolIds.length ||
    mergedData.deletedExerciseIds.length !== sharedData.deletedExerciseIds.length ||
    mergedData.deletedNoteIds.length !== sharedData.deletedNoteIds.length
  ) {
    await saveSharedData(mergedData);
    return mergedData;
  }

  return sharedData;
}

export function loadData(): PlatformData {
  localStorage.removeItem('school_platform_data_v1');
  localStorage.removeItem('school_platform_session_v1');

  const stored = localStorage.getItem(DATA_KEY);
  if (!stored) {
    return cloneSeedData();
  }

  try {
    const parsed = JSON.parse(stored) as PlatformData;
    return normalizePlatformData(parsed);
  } catch {
    return cloneSeedData();
  }
}
