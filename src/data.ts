import { Capacitor } from '@capacitor/core';
import type {
  AccountEditState,
  PlatformData,
  PlatformUser,
  PushTokenRecord,
  Role,
  SchoolRecord,
  SecondaryStream,
  SharedDataSnapshot,
  Subject,
  TeacherNote,
  View
} from './types';
import {
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  assignedYearSubjects,
  defaultClassGroups,
  exerciseMatchesStudent,
  exerciseMatchesTeacherAssignment,
  sameClassGroup,
  secondaryStreams,
  teacherSubjectForYear,
  uniqueStrings
} from './education';
import { DATA_KEY, REMOTE_STATE_ENDPOINT } from './data-constants';
import { applyDeletionTombstones, purgeExpiredTrashedSchools, schoolIsTrashed } from './data-tombstones';

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

export function getSchool(data: PlatformData, user?: PlatformUser) {
  if (!user?.schoolId) {
    return undefined;
  }

  return data.schools.find((school) => school.id === user.schoolId);
}

export function userSchoolIsTrashed(data: PlatformData, user: PlatformUser) {
  if (!user.schoolId) {
    return false;
  }

  return schoolIsTrashed(data.schools.find((school) => school.id === user.schoolId));
}

export function canAuthenticateUser(data: PlatformData, user: PlatformUser) {
  return user.status === 'active' && !userSchoolIsTrashed(data, user);
}

export function userCanSeeSchool(user: PlatformUser, school: SchoolRecord) {
  if (schoolIsTrashed(school)) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return user.schoolId === school.id;
}

export function scopedUsers(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.users;
  }

  if (user.role === 'director') {
    return data.users.filter((candidate) => candidate.schoolId === user.schoolId);
  }

  return data.users.filter((candidate) => candidate.id === user.id);
}

export function scopedExercises(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.exercises;
  }

  if (user.role === 'director') {
    return data.exercises.filter((exercise) => exercise.schoolId === user.schoolId);
  }

  if (user.role === 'teacher') {
    return data.exercises.filter(
      (exercise) =>
        exercise.schoolId === user.schoolId &&
        exercise.subject === teacherSubjectForYear(user, exercise.schoolYear) &&
        exerciseMatchesTeacherAssignment(exercise, user)
    );
  }

  return data.exercises.filter((exercise) => exerciseMatchesStudent(exercise, user));
}

export function scopedAnnouncements(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.announcements;
  }

  if (!user.schoolId) {
    return [];
  }

  return data.announcements.filter((announcement) => announcement.schoolId === user.schoolId);
}

export function noteMatchesStudent(note: TeacherNote, user: PlatformUser) {
  if (user.role !== 'student') {
    return false;
  }

  const yearMatches = note.schoolYear === undefined || note.schoolYear === user.schoolYear;
  const streamMatches = note.stream === undefined || note.stream === user.stream;
  const classMatches = note.classGroup === undefined || sameClassGroup(note.classGroup, user.classGroup ?? '');

  return note.schoolId === user.schoolId && note.stage === user.stage && yearMatches && streamMatches && classMatches;
}

export function scopedNotes(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.notes;
  }

  if (user.role === 'director') {
    return data.notes.filter((note) => note.schoolId === user.schoolId);
  }

  if (user.role === 'teacher') {
    return data.notes.filter((note) => note.teacherId === user.id);
  }

  return data.notes.filter((note) => noteMatchesStudent(note, user));
}

export function defaultView(role: Role): View {
  if (role === 'student') {
    return 'exercises';
  }

  return 'overview';
}

export function canToggleUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

export function canEditUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

export function canDeleteUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

export function makeAccountEditState(target: PlatformUser, data: PlatformData): AccountEditState {
  const school = getSchool(data, target);
  const classGroup = target.classGroup?.trim() ?? '';
  const classChoice = defaultClassGroups.includes(classGroup) ? classGroup : classGroup ? 'custom' : '1';
  const yearStreamClassGroups = assignedYearStreamClassGroups(target);
  const firstStreamByYear = Object.fromEntries(
    Object.entries(yearStreamClassGroups).map(([year, streams]) => [year, (Object.keys(streams)[0] as SecondaryStream | undefined) ?? ''])
  ) as Record<string, SecondaryStream | ''>;

  return {
    id: target.id,
    role: target.role,
    name: target.name,
    email: target.email,
    password: target.password,
    status: target.status,
    schoolName: school?.name ?? '',
    domain: school?.domain ?? '',
    stage: target.stage ?? school?.stage ?? 'middle',
    subject: target.subject ?? 'math',
    subjectsByYear: Object.fromEntries(
      Object.entries(assignedYearSubjects(target)).map(([year, subject]) => [year, subject])
    ) as Record<string, Subject>,
    schoolYear: target.schoolYear ?? 1,
    classChoice,
    customClassGroup: classChoice === 'custom' ? classGroup : '',
    stream: target.stream ?? '',
    schoolYears: assignedSchoolYears(target).length > 0 ? assignedSchoolYears(target) : [target.schoolYear ?? 1],
    yearClassGroups: assignedYearClassGroups(target),
    yearStreamClassGroups,
    streamChoiceByYear: firstStreamByYear,
    classChoiceByYear: {},
    customClassByYear: {}
  };
}
