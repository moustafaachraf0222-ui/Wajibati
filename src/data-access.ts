import type { PlatformData, PlatformUser, Role, SchoolRecord, TeacherNote, View } from './types';
import {
  exerciseMatchesStudent,
  exerciseMatchesTeacherAssignment,
  sameClassGroup,
  teacherAllowedSubjectsForYear
} from './education';
import { schoolIsTrashed } from './data-tombstones';

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
        teacherAllowedSubjectsForYear(user, exercise.schoolYear).includes(exercise.subject) &&
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
  if (role === 'supervisor') {
    return 'absences';
  }

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

  return (
    currentUser.role === 'director' &&
    target.schoolId === currentUser.schoolId &&
    (target.role === 'supervisor' || target.role === 'teacher' || target.role === 'student')
  );
}

export function canEditUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return (
    currentUser.role === 'director' &&
    target.schoolId === currentUser.schoolId &&
    (target.role === 'supervisor' || target.role === 'teacher' || target.role === 'student')
  );
}

export function canDeleteUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return (
    currentUser.role === 'director' &&
    target.schoolId === currentUser.schoolId &&
    (target.role === 'supervisor' || target.role === 'teacher' || target.role === 'student')
  );
}
