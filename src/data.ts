import { Capacitor } from '@capacitor/core';
import type {
  AccountEditState,
  Language,
  PlatformData,
  PlatformUser,
  PushTokenRecord,
  RememberedAccount,
  Role,
  SchoolRecord,
  SecondaryStream,
  SharedDataSnapshot,
  Subject,
  TeacherNote,
  Theme,
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

export const DATA_KEY = 'school_platform_data_v2';
export const SESSION_KEY = 'school_platform_session_v2';
export const LANGUAGE_KEY = 'school_platform_language_v1';
export const THEME_KEY = 'school_platform_theme_v1';
export const REMEMBERED_ACCOUNTS_KEY = 'school_platform_remembered_accounts_v1';
export const REMOTE_STATE_ENDPOINT = import.meta.env.VITE_REMOTE_STATE_ENDPOINT || 'https://wajibati.pages.dev/api/state';
export const SCHOOL_TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;
export const SHARED_DATA_REFRESH_MS = 2_000;

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

export function isLanguage(value: string | null): value is Language {
  return value === 'ar' || value === 'fr' || value === 'en';
}

export function loadLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : 'ar';
}

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return isTheme(stored) ? stored : 'light';
}

export function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'director' || value === 'teacher' || value === 'student';
}

export function loadRememberedAccounts(): RememberedAccount[] {
  try {
    const stored = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();

    return parsed
      .filter(
        (item): item is RememberedAccount =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.email === 'string' &&
          isRole(item.role)
      )
      .filter((item) => {
        const idKey = `id:${item.id}`;
        const emailKey = `email:${item.email.toLowerCase()}`;
        if (seen.has(idKey) || seen.has(emailKey)) {
          return false;
        }
        seen.add(idKey);
        seen.add(emailKey);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberedAccountFromUser(account: PlatformUser): RememberedAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };
}

export function mergeRememberedAccount(previous: RememberedAccount[], account: PlatformUser) {
  const nextAccount = rememberedAccountFromUser(account);
  return [
    nextAccount,
    ...previous.filter((item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase())
  ].slice(0, 8);
}

export function rememberedAccountListsEqual(left: RememberedAccount[], right: RememberedAccount[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function saveRememberedAccounts(accounts: RememberedAccount[]) {
  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function rememberStoredAccount(account: PlatformUser) {
  const next = mergeRememberedAccount(loadRememberedAccounts(), account);
  saveRememberedAccounts(next);
  return next;
}

export function forgetStoredAccount(account: PlatformUser) {
  const next = loadRememberedAccounts().filter(
    (item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase()
  );
  saveRememberedAccounts(next);
  return next;
}

export function pruneRememberedAccounts(users: PlatformUser[]) {
  const next = loadRememberedAccounts().filter((remembered) =>
    users.some((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase())
  );

  saveRememberedAccounts(next);
  return next;
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

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function randomIndex(max: number) {
  if (max <= 0) {
    return 0;
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function generateAccountCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const alphabet = `${letters}${digits}`;
  const characters = [
    letters[randomIndex(letters.length)],
    digits[randomIndex(digits.length)],
    ...Array.from({ length: 4 }, () => alphabet[randomIndex(alphabet.length)])
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

export function normalizeEmailDomain(domain: string) {
  return domain.replace(/^@/, '').trim().toLowerCase();
}

export function compactEmailLocalPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function generateSchoolEmail(name: string, role: 'teacher' | 'student', domain: string, users: PlatformUser[]) {
  const emailDomain = normalizeEmailDomain(domain);
  const localBase = compactEmailLocalPart(name) || role;
  const usedEmails = new Set(users.map((user) => user.email.toLowerCase()));
  let suffix = 0;
  let email = `${localBase}@${emailDomain}`;

  while (usedEmails.has(email.toLowerCase())) {
    suffix += 1;
    email = `${localBase}${suffix}@${emailDomain}`;
  }

  return email;
}

export function getSchool(data: PlatformData, user?: PlatformUser) {
  if (!user?.schoolId) {
    return undefined;
  }

  return data.schools.find((school) => school.id === user.schoolId);
}

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
