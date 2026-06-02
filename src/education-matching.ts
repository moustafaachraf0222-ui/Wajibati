import type { Exercise, PlatformUser, SecondaryStream } from './types';
import { assignedYearClassGroups, assignedYearStreamClassGroups } from './education-assignments';

export function sameClassGroup(left?: string, right?: string) {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();
}

export function exerciseMatchesStudent(exercise: Exercise, user: PlatformUser) {
  if (user.role !== 'student' || !user.schoolId || !user.stage || !user.schoolYear || !user.classGroup?.trim()) {
    return false;
  }

  if (exercise.schoolId !== user.schoolId || exercise.stage !== user.stage || exercise.schoolYear !== user.schoolYear) {
    return false;
  }

  if (!sameClassGroup(exercise.classGroup, user.classGroup)) {
    return false;
  }

  if (user.stage === 'secondary') {
    return Boolean(exercise.stream && user.stream && exercise.stream === user.stream);
  }

  return true;
}

export function exerciseMatchesTeacherAssignment(exercise: Exercise, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    const years = Object.keys(streamGrouped).map(Number);
    const yearMatches = exercise.schoolYear === undefined || years.includes(exercise.schoolYear);
    const streamGroupsForYear =
      exercise.schoolYear === undefined ? Object.values(streamGrouped) : [streamGrouped[String(exercise.schoolYear)] ?? {}];
    const streamMatches =
      exercise.stream === undefined || streamGroupsForYear.some((streams) => Boolean(streams[exercise.stream as SecondaryStream]?.length));
    const classesForTarget = streamGroupsForYear.flatMap((streams) =>
      exercise.stream === undefined ? Object.values(streams).flat() : streams[exercise.stream as SecondaryStream] ?? []
    );
    const classMatches = exercise.classGroup === undefined || classesForTarget.some((group) => sameClassGroup(group, exercise.classGroup));

    return yearMatches && streamMatches && classMatches;
  }

  const grouped = assignedYearClassGroups(user);
  const years = Object.keys(grouped).map(Number);
  const yearMatches = exercise.schoolYear === undefined || years.includes(exercise.schoolYear);
  const classesForYear = exercise.schoolYear === undefined ? Object.values(grouped).flat() : grouped[String(exercise.schoolYear)] ?? [];
  const classMatches = exercise.classGroup === undefined || classesForYear.some((group) => sameClassGroup(group, exercise.classGroup));

  return yearMatches && classMatches;
}
