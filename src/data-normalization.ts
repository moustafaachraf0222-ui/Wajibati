import type { PlatformData } from './types';
import { secondaryStreams, uniqueStrings } from './education';
import { DATA_KEY } from './data-constants';
import { cloneSeedData } from './data-seed';
import { applyDeletionTombstones, purgeExpiredTrashedSchools } from './data-tombstones';

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
    deletedSchoolIds: Array.isArray(source.deletedSchoolIds)
      ? uniqueStrings(source.deletedSchoolIds.filter((id): id is string => typeof id === 'string'))
      : fallback.deletedSchoolIds,
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
