import type { PlatformData, PlatformUser, SchoolRecord } from './types';
import { uniqueStrings } from './education';
import { SCHOOL_TRASH_RETENTION_MS } from './data-constants';

export function schoolIsTrashed(school?: SchoolRecord) {
  return Boolean(school?.deletedAt);
}

export function schoolTrashExpiresAt(school: SchoolRecord) {
  if (!school.deletedAt) {
    return null;
  }

  const deletedAt = Date.parse(school.deletedAt);
  if (Number.isNaN(deletedAt)) {
    return new Date();
  }

  return new Date(deletedAt + SCHOOL_TRASH_RETENTION_MS);
}

export function schoolTrashIsExpired(school: SchoolRecord, now = Date.now()) {
  const expiresAt = schoolTrashExpiresAt(school);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

export function deleteUserRecords(previous: PlatformData, target: PlatformUser): PlatformData {
  const removedExerciseIds =
    target.role === 'teacher' ? previous.exercises.filter((exercise) => exercise.teacherId === target.id).map((exercise) => exercise.id) : [];
  const removedNoteIds = target.role === 'teacher' ? previous.notes.filter((note) => note.teacherId === target.id).map((note) => note.id) : [];

  return {
    ...previous,
    users: previous.users.filter((user) => user.id !== target.id),
    schools: previous.schools.map((school) => (school.directorId === target.id ? { ...school, directorId: undefined } : school)),
    exercises: previous.exercises.filter((exercise) => exercise.teacherId !== target.id),
    announcements: previous.announcements.filter((announcement) => announcement.authorId !== target.id),
    notes: previous.notes.filter((note) => note.teacherId !== target.id),
    absenceSchedules: previous.absenceSchedules.filter((schedule) => schedule.createdBy !== target.id),
    absenceRecords: previous.absenceRecords.filter((record) => record.studentId !== target.id && record.markedBy !== target.id),
    completions: Object.fromEntries(
      Object.entries(previous.completions)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, done]) => [userId, done.filter((exerciseId) => !removedExerciseIds.includes(exerciseId))])
    ),
    completionDates: Object.fromEntries(
      Object.entries(previous.completionDates)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, dates]) => [
          userId,
          Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !removedExerciseIds.includes(exerciseId)))
        ])
    ),
    feedback: Object.fromEntries(
      Object.entries(previous.feedback)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, feedback]) => [
          userId,
          Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !removedExerciseIds.includes(exerciseId)))
        ])
    ),
    pushTokens: Object.fromEntries(Object.entries(previous.pushTokens).filter(([userId]) => userId !== target.id)),
    deletedExerciseIds: uniqueStrings([...previous.deletedExerciseIds, ...removedExerciseIds]),
    deletedNoteIds: uniqueStrings([...previous.deletedNoteIds, ...removedNoteIds])
  };
}

export function applyDeletedSchoolTombstones(data: PlatformData): PlatformData {
  const deletedSchoolIds = new Set(data.deletedSchoolIds);
  if (deletedSchoolIds.size === 0) {
    return data;
  }

  const removedUserIds = new Set(data.users.filter((user) => user.schoolId && deletedSchoolIds.has(user.schoolId)).map((user) => user.id));
  const removedExerciseIds = new Set(data.exercises.filter((exercise) => deletedSchoolIds.has(exercise.schoolId)).map((exercise) => exercise.id));

  return {
    ...data,
    schools: data.schools.filter((school) => !deletedSchoolIds.has(school.id)),
    users: data.users.filter((user) => !user.schoolId || !deletedSchoolIds.has(user.schoolId)),
    exercises: data.exercises.filter((exercise) => !deletedSchoolIds.has(exercise.schoolId)),
    announcements: data.announcements.filter((announcement) => !deletedSchoolIds.has(announcement.schoolId)),
    notes: data.notes.filter((note) => !deletedSchoolIds.has(note.schoolId)),
    absenceSchedules: data.absenceSchedules.filter((schedule) => !deletedSchoolIds.has(schedule.schoolId)),
    absenceRecords: data.absenceRecords.filter((record) => !deletedSchoolIds.has(record.schoolId)),
    completions: Object.fromEntries(
      Object.entries(data.completions)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, done]) => [userId, done.filter((exerciseId) => !removedExerciseIds.has(exerciseId))])
    ),
    completionDates: Object.fromEntries(
      Object.entries(data.completionDates)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, dates]) => [
          userId,
          Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId)))
        ])
    ),
    feedback: Object.fromEntries(
      Object.entries(data.feedback)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, feedback]) => [
          userId,
          Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId)))
        ])
    ),
    pushTokens: Object.fromEntries(Object.entries(data.pushTokens).filter(([userId]) => !removedUserIds.has(userId)))
  };
}

export function applyDeletedExerciseTombstones(data: PlatformData): PlatformData {
  const deletedExerciseIds = new Set(data.deletedExerciseIds);
  if (deletedExerciseIds.size === 0) {
    return data;
  }

  return {
    ...data,
    exercises: data.exercises.filter((exercise) => !deletedExerciseIds.has(exercise.id)),
    completions: Object.fromEntries(
      Object.entries(data.completions).map(([userId, done]) => [userId, done.filter((exerciseId) => !deletedExerciseIds.has(exerciseId))])
    ),
    completionDates: Object.fromEntries(
      Object.entries(data.completionDates).map(([userId, dates]) => [
        userId,
        Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !deletedExerciseIds.has(exerciseId)))
      ])
    ),
    feedback: Object.fromEntries(
      Object.entries(data.feedback).map(([userId, feedback]) => [
        userId,
        Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !deletedExerciseIds.has(exerciseId)))
      ])
    )
  };
}

export function applyDeletedNoteTombstones(data: PlatformData): PlatformData {
  const deletedNoteIds = new Set(data.deletedNoteIds);
  if (deletedNoteIds.size === 0) {
    return data;
  }

  return {
    ...data,
    notes: data.notes.filter((note) => !deletedNoteIds.has(note.id))
  };
}

export function applyDeletionTombstones(data: PlatformData): PlatformData {
  return applyDeletedNoteTombstones(applyDeletedExerciseTombstones(applyDeletedSchoolTombstones(data)));
}

export function deleteSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return applyDeletionTombstones({
    ...previous,
    deletedSchoolIds: uniqueStrings([...previous.deletedSchoolIds, target.id])
  });
}

export function trashSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return {
    ...previous,
    schools: previous.schools.map((school) =>
      school.id === target.id ? { ...school, deletedAt: school.deletedAt ?? new Date().toISOString() } : school
    )
  };
}

export function restoreSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return {
    ...previous,
    schools: previous.schools.map((school) => {
      if (school.id !== target.id) {
        return school;
      }

      const { deletedAt: _deletedAt, ...restoredSchool } = school;
      return restoredSchool;
    })
  };
}

export function purgeExpiredTrashedSchools(data: PlatformData, now = Date.now()): PlatformData {
  const expiredSchools = data.schools.filter((school) => schoolIsTrashed(school) && schoolTrashIsExpired(school, now));
  if (expiredSchools.length === 0) {
    return data;
  }

  return expiredSchools.reduce((nextData, school) => deleteSchoolRecords(nextData, school), data);
}
