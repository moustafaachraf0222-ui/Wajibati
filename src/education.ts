import type { Exercise, Language, PlatformUser, SecondaryStream } from './types';
import { schoolYearLabel, stageNames, tr } from './i18n';
import {
  assignedClassGroups,
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  parseClassGroups
} from './education-assignments';
import { secondaryStreamLabel } from './education-subjects';

export * from './education-assignments';
export * from './education-constants';
export * from './education-subjects';

export function schoolYearsLabel(language: Language, user: PlatformUser) {
  const years = assignedSchoolYears(user);
  if (years.length === 0) {
    return '-';
  }

  return years.map((year) => schoolYearLabel(language, user.stage, year)).join('، ');
}

export function classGroupsLabel(user: PlatformUser) {
  const groups = assignedClassGroups(user);
  return groups.length > 0 ? groups.join('، ') : '-';
}

export function yearClassGroupsLabel(language: Language, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    return streamEntries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([year, streams]) => {
        const streamText = Object.entries(streams)
          .map(([stream, groups]) => `${secondaryStreamLabel(language, stream as SecondaryStream, Number(year))}: ${(groups ?? []).join('، ')}`)
          .join(' / ');

        return `${schoolYearLabel(language, user.stage, Number(year))}: ${streamText}`;
      })
      .join(' | ');
  }

  const grouped = assignedYearClassGroups(user);
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return '-';
  }

  return entries
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([year, groups]) => `${schoolYearLabel(language, user.stage, Number(year))}: ${groups.join('، ')}`)
    .join(' | ');
}

export function scopedYearDetailsLabel(language: Language, user: PlatformUser, details: Array<{ year: number; text: string }>) {
  const visibleDetails = details.filter((detail) => detail.text.trim());

  if (visibleDetails.length === 0) {
    return '-';
  }

  if (visibleDetails.length === 1) {
    return visibleDetails[0].text;
  }

  return visibleDetails.map((detail) => `${schoolYearLabel(language, user.stage, detail.year)}: ${detail.text}`).join(' | ');
}

export function teacherTableClassGroupsLabel(language: Language, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    return scopedYearDetailsLabel(
      language,
      user,
      streamEntries
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([year, streams]) => ({
          year: Number(year),
          text: parseClassGroups(Object.values(streams).flat().join(',')).join('، ')
        }))
    );
  }

  const grouped = assignedYearClassGroups(user);
  const entries = Object.entries(grouped);

  if (entries.length > 0) {
    return scopedYearDetailsLabel(
      language,
      user,
      entries
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([year, groups]) => ({ year: Number(year), text: parseClassGroups(groups.join(',')).join('، ') }))
    );
  }

  return classGroupsLabel(user);
}

export function teacherTableStreamsLabel(language: Language, user: PlatformUser) {
  const streamEntries = Object.entries(assignedYearStreamClassGroups(user));

  if (streamEntries.length === 0) {
    return '-';
  }

  return scopedYearDetailsLabel(
    language,
    user,
    streamEntries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([year, streams]) => ({
        year: Number(year),
        text: (Object.keys(streams) as SecondaryStream[]).map((stream) => secondaryStreamLabel(language, stream, Number(year))).join('، ')
      }))
  );
}

export function assignmentSummaryLabel(language: Language, user: PlatformUser) {
  if (user.role === 'admin') {
    return tr(language, 'noAssignments');
  }

  if (user.role === 'director') {
    return user.stage ? stageNames[language][user.stage] : tr(language, 'noAssignments');
  }

  if (user.role === 'student') {
    const parts = [
      schoolYearLabel(language, user.stage, user.schoolYear),
      user.stream ? secondaryStreamLabel(language, user.stream, user.schoolYear) : '',
      user.classGroup ? `${tr(language, 'classGroup')} ${user.classGroup}` : ''
    ].filter((part) => part && part !== '-');

    return parts.length > 0 ? parts.join(' / ') : tr(language, 'noAssignments');
  }

  const years = assignedSchoolYears(user);
  const classes = assignedClassGroups(user);
  const streams = Object.values(assignedYearStreamClassGroups(user)).flatMap((streamGroups) => Object.keys(streamGroups));
  const parts = [`${years.length} ${tr(language, 'schoolYears')}`, `${classes.length} ${tr(language, 'classGroups')}`];

  if (user.stage === 'secondary') {
    parts.splice(1, 0, `${new Set(streams).size} ${tr(language, 'stream')}`);
  }

  return years.length > 0 || classes.length > 0 ? parts.join(' / ') : tr(language, 'noAssignments');
}

export function hasAccountDetails(user: PlatformUser) {
  return user.role !== 'admin';
}

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
