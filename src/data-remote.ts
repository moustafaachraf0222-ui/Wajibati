import type { PlatformData, SharedDataSnapshot } from './types';
import { uniqueStrings } from './education';
import { REMOTE_STATE_ENDPOINT } from './data-constants';
import { normalizePlatformData } from './data-normalization';
import { isSeedOnlyData } from './data-seed';
import { applyDeletionTombstones } from './data-tombstones';

function activationTimestamp(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeStudentActivations(baseData: PlatformData, sourceData: PlatformData) {
  const recordsById = new Map(baseData.studentActivations.map((activation) => [activation.id, activation]));

  sourceData.studentActivations.forEach((sourceActivation) => {
    const baseActivation = recordsById.get(sourceActivation.id);
    if (!baseActivation) {
      recordsById.set(sourceActivation.id, sourceActivation);
      return;
    }

    if (activationTimestamp(sourceActivation.activatedAt) > activationTimestamp(baseActivation.activatedAt)) {
      recordsById.set(sourceActivation.id, sourceActivation);
    }
  });

  return [...recordsById.values()];
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
    studentActivations: mergeStudentActivations(baseData, sourceData),
    accountCodes: uniqueStrings([...baseData.accountCodes, ...sourceData.accountCodes]),
    deletedSchoolIds: uniqueStrings([...baseData.deletedSchoolIds, ...sourceData.deletedSchoolIds]),
    deletedExerciseIds: uniqueStrings([...baseData.deletedExerciseIds, ...sourceData.deletedExerciseIds]),
    deletedNoteIds: uniqueStrings([...baseData.deletedNoteIds, ...sourceData.deletedNoteIds]),
    deletedScheduleIds: uniqueStrings([...baseData.deletedScheduleIds, ...sourceData.deletedScheduleIds])
  });
}

export function hasUserData(data: PlatformData) {
  return (
    data.schools.length > 0 ||
    data.users.length > 1 ||
    data.accountCredentials.length > 0 ||
    data.studentActivations.length > 0 ||
    data.exercises.length > 0 ||
    data.announcements.length > 0 ||
    data.notes.length > 0 ||
    data.absenceSchedules.length > 0 ||
    data.absenceRecords.length > 0 ||
    data.absenceReports.length > 0 ||
    data.laboratories.length > 0 ||
    data.labDevices.length > 0 ||
    data.labFaultReports.length > 0 ||
    data.labReservationRequests.length > 0 ||
    data.transferRequests.length > 0 ||
    data.canteenCards.length > 0 ||
    data.canteenMealScans.length > 0 ||
    data.deletedSchoolIds.length > 0 ||
    data.deletedExerciseIds.length > 0 ||
    data.deletedNoteIds.length > 0 ||
    data.deletedScheduleIds.length > 0 ||
    Object.keys(data.completions).length > 0 ||
    Object.keys(data.completionDates).length > 0 ||
    Object.keys(data.feedback).length > 0
  );
}

export async function promoteLocalDataIfRemoteIsEmpty(sharedData: PlatformData, localData: PlatformData) {
  if (isSeedOnlyData(sharedData) && hasUserData(localData)) {
    await saveSharedData(localData);
    return localData;
  }

  const mergedData = mergeDeletionTombstones(sharedData, localData);
  if (
    JSON.stringify(mergedData.studentActivations) !== JSON.stringify(sharedData.studentActivations) ||
    mergedData.deletedSchoolIds.length !== sharedData.deletedSchoolIds.length ||
    mergedData.deletedExerciseIds.length !== sharedData.deletedExerciseIds.length ||
    mergedData.deletedNoteIds.length !== sharedData.deletedNoteIds.length ||
    mergedData.deletedScheduleIds.length !== sharedData.deletedScheduleIds.length
  ) {
    await saveSharedData(mergedData);
    return mergedData;
  }

  return sharedData;
}
