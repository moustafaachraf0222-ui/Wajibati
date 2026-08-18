import type { AbsenceSchedule, PlatformData } from './types';
import { secondaryStreams, uniqueStrings } from './education';
import { DATA_KEY } from './data-constants';
import { cloneSeedData } from './data-seed';
import { applyDeletionTombstones, purgeExpiredAbsenceJustifications, purgeExpiredTrashedSchools } from './data-tombstones';

function normalizedScheduleClassGroup(value: string) {
  return value.trim().toLowerCase();
}

function scheduleTargetKey(schedule: AbsenceSchedule, target: NonNullable<AbsenceSchedule['targets']>[number]) {
  return `${schedule.schoolId}|${schedule.stage ?? ''}|${target.schoolYear}|${target.stream ?? ''}|${normalizedScheduleClassGroup(target.classGroup)}`;
}

function scheduleTimestamp(schedule: AbsenceSchedule) {
  const timestamp = Date.parse(schedule.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function scheduleIsNewer(candidate: AbsenceSchedule, current: AbsenceSchedule) {
  const candidateTimestamp = scheduleTimestamp(candidate);
  const currentTimestamp = scheduleTimestamp(current);
  return candidateTimestamp > currentTimestamp || (candidateTimestamp === currentTimestamp && candidate.id.localeCompare(current.id) > 0);
}

function normalizeAbsenceSchedules(schedules: AbsenceSchedule[]) {
  const schedulesWithUniqueTargets = schedules.map((schedule) => {
    if (!Array.isArray(schedule.targets) || schedule.targets.length === 0) {
      return schedule;
    }

    const seenTargets = new Set<string>();
    const targets = schedule.targets.filter((target) => {
      const key = scheduleTargetKey(schedule, target);
      if (seenTargets.has(key)) {
        return false;
      }

      seenTargets.add(key);
      return true;
    });

    return targets.length === schedule.targets.length ? schedule : { ...schedule, targets };
  });

  const activeScheduleByTarget = new Map<string, AbsenceSchedule>();
  schedulesWithUniqueTargets.forEach((schedule) => {
    schedule.targets?.forEach((target) => {
      const key = scheduleTargetKey(schedule, target);
      const currentSchedule = activeScheduleByTarget.get(key);
      if (!currentSchedule || scheduleIsNewer(schedule, currentSchedule)) {
        activeScheduleByTarget.set(key, schedule);
      }
    });
  });

  return schedulesWithUniqueTargets.map((schedule) => {
    if (!schedule.targets?.length) {
      return schedule;
    }

    const targets = schedule.targets.filter((target) => activeScheduleByTarget.get(scheduleTargetKey(schedule, target))?.id === schedule.id);
    return targets.length === schedule.targets.length ? schedule : { ...schedule, targets };
  });
}

export const WAJIBATI_DOMAIN = 'wajibati.dz';

function migrateSchoolDomains(schools: PlatformData['schools']) {
  return schools.map((school) => (school.domain === WAJIBATI_DOMAIN ? school : { ...school, domain: WAJIBATI_DOMAIN }));
}

function migrateUserEmailDomains(users: PlatformData['users']) {
  return users.map((user) => {
    if (user.role === 'admin' || !user.email) {
      return user;
    }
    const atIndex = user.email.lastIndexOf('@');
    if (atIndex <= 0) {
      return user;
    }
    const localPart = user.email.slice(0, atIndex);
    const migratedEmail = `${localPart}@${WAJIBATI_DOMAIN}`;
    return migratedEmail === user.email ? user : { ...user, email: migratedEmail };
  });
}

export function normalizePlatformData(value: Partial<PlatformData> | null | undefined): PlatformData {
  const fallback = cloneSeedData();
  const source = value ?? {};
  const deletedScheduleIds = Array.isArray(source.deletedScheduleIds)
    ? uniqueStrings(source.deletedScheduleIds.filter((id): id is string => typeof id === 'string'))
    : fallback.deletedScheduleIds;

  const normalized = {
    ...fallback,
    ...source,
    schools: Array.isArray(source.schools)
      ? migrateSchoolDomains(
          source.schools.map((school) =>
            school.stage === 'secondary' && (!Array.isArray(school.streams) || school.streams.length === 0)
              ? { ...school, streams: [...secondaryStreams] }
              : school
          )
        )
      : fallback.schools,
    users: Array.isArray(source.users) ? migrateUserEmailDomains(source.users) : fallback.users,
    studentActivations: Array.isArray(source.studentActivations) ? source.studentActivations : fallback.studentActivations,
    exercises: Array.isArray(source.exercises) ? source.exercises : fallback.exercises,
    announcements: Array.isArray(source.announcements) ? source.announcements : fallback.announcements,
    notes: Array.isArray(source.notes) ? source.notes : fallback.notes,
    completions: source.completions && typeof source.completions === 'object' ? source.completions : fallback.completions,
    completionDates:
      source.completionDates && typeof source.completionDates === 'object' ? source.completionDates : fallback.completionDates,
    feedback: source.feedback && typeof source.feedback === 'object' ? source.feedback : fallback.feedback,
    absenceSchedules: Array.isArray(source.absenceSchedules)
      ? normalizeAbsenceSchedules(source.absenceSchedules.filter((schedule) => !deletedScheduleIds.includes(schedule.id)))
      : fallback.absenceSchedules,
    absenceRecords: Array.isArray(source.absenceRecords) ? source.absenceRecords : fallback.absenceRecords,
    absenceReports: Array.isArray(source.absenceReports) ? source.absenceReports : fallback.absenceReports,
    laboratories: Array.isArray(source.laboratories) ? source.laboratories : fallback.laboratories,
    labDevices: Array.isArray(source.labDevices) ? source.labDevices : fallback.labDevices,
    labFaultReports: Array.isArray(source.labFaultReports) ? source.labFaultReports : fallback.labFaultReports,
    labReservationRequests: Array.isArray(source.labReservationRequests) ? source.labReservationRequests : fallback.labReservationRequests,
    transferRequests: Array.isArray(source.transferRequests) ? source.transferRequests : fallback.transferRequests,
    canteenCards: Array.isArray(source.canteenCards) ? source.canteenCards : fallback.canteenCards,
    canteenMealScans: Array.isArray(source.canteenMealScans) ? source.canteenMealScans : fallback.canteenMealScans,
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
    deletedScheduleIds,
    settings: {
      ...fallback.settings,
      ...(source.settings ?? {})
    }
  };

  return applyDeletionTombstones(purgeExpiredAbsenceJustifications(purgeExpiredTrashedSchools(normalized)));
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
