import type { Exercise, Language, PlatformUser, SchoolRecord, SecondaryStream, Subject, YearStreamClassGroups } from './types';
import { schoolYearLabel, secondaryStreamNames, stageNames, subjectNames, tr } from './i18n';
import {
  firstYearSecondaryStreams,
  middleSubjects,
  primaryLowerYearExcludedSubjects,
  primarySubjects,
  secondarySubjectStreams,
  secondarySubjects
} from './education-constants';
import {
  assignedClassGroups,
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  normalizeYearStreamClassGroups,
  parseClassGroups
} from './education-assignments';

export * from './education-assignments';
export * from './education-constants';

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

export function assignedYearSubjects(user: PlatformUser) {
  const years = assignedSchoolYears(user);
  const subjectsByYear: Record<string, Subject> = {};

  years.forEach((year) => {
    const key = String(year);
    const subject = user.subjectsByYear?.[key] ?? user.subject;
    if (subject) {
      subjectsByYear[key] = subject;
    }
  });

  Object.entries(user.subjectsByYear ?? {}).forEach(([year, subject]) => {
    if (subject) {
      subjectsByYear[year] = subject;
    }
  });

  return subjectsByYear;
}

export function teacherSubjectForYear(user: PlatformUser, schoolYear: number | undefined) {
  if (!schoolYear) {
    return user.subject;
  }

  return assignedYearSubjects(user)[String(schoolYear)] ?? user.subject;
}

export function teacherSubjectsLabel(language: Language, user: PlatformUser) {
  if (user.role !== 'teacher') {
    return user.subject ? subjectNames[language][user.subject] : '-';
  }

  const subjectEntries = Object.entries(assignedYearSubjects(user)).sort(([left], [right]) => Number(left) - Number(right));
  if (subjectEntries.length === 0) {
    return user.subject ? subjectNames[language][user.subject] : '-';
  }

  const uniqueSubjects = [...new Set(subjectEntries.map(([, subject]) => subject))];
  if (uniqueSubjects.length === 1) {
    return subjectNames[language][uniqueSubjects[0]];
  }

  return subjectEntries.map(([year, subject]) => `${schoolYearLabel(language, user.stage, Number(year))}: ${subjectNames[language][subject]}`).join(' | ');
}

export function selectedStreamsForTeacherYear(yearStreamClassGroups: YearStreamClassGroups, school: SchoolRecord | undefined, schoolYear: number) {
  const selectedStreams = Object.keys(normalizeYearStreamClassGroups(yearStreamClassGroups)[String(schoolYear)] ?? {}) as SecondaryStream[];
  if (school?.stage === 'secondary') {
    return selectedStreams;
  }

  return selectedStreams.length > 0 ? selectedStreams : secondaryStreamsForYear(school, schoolYear);
}

export function subjectOptionsForTeacherYear(school: SchoolRecord | undefined, yearStreamClassGroups: YearStreamClassGroups, schoolYear: number) {
  const selectedStreams = selectedStreamsForTeacherYear(yearStreamClassGroups, school, schoolYear);
  if (school?.stage === 'secondary' && selectedStreams.length === 0) {
    return [];
  }

  return subjectsForTeacherYear(school, selectedStreams, schoolYear);
}

export function normalizeTeacherSubjectsByYear(
  school: SchoolRecord | undefined,
  schoolYears: number[],
  yearStreamClassGroups: YearStreamClassGroups,
  subjectsByYear: Record<string, Subject | ''>,
  fallbackSubject?: Subject
) {
  const normalized: Record<string, Subject> = {};

  schoolYears.forEach((year) => {
    const key = String(year);
    const options = subjectOptionsForTeacherYear(school, yearStreamClassGroups, year);
    const selected = subjectsByYear[key] || fallbackSubject || '';
    const subject = selected && options.includes(selected as Subject) ? (selected as Subject) : options[0];

    if (subject) {
      normalized[key] = subject;
    }
  });

  return normalized;
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

export function enabledSecondaryStreams(school?: SchoolRecord) {
  return school?.stage === 'secondary' ? school.streams ?? [] : [];
}

export function secondaryStreamsForYear(school: SchoolRecord | undefined, schoolYear: number | undefined) {
  const enabledStreams = enabledSecondaryStreams(school);

  if (school?.stage !== 'secondary') {
    return [];
  }

  if (schoolYear === 1) {
    return firstYearSecondaryStreams.filter((stream) => enabledStreams.includes(stream));
  }

  return enabledStreams;
}

export function secondaryStreamLabel(language: Language, stream: SecondaryStream, schoolYear?: number) {
  if (schoolYear === 1 && stream === 'literature_philosophy') {
    return {
      ar: 'آداب',
      fr: 'Lettres',
      en: 'Literature'
    }[language];
  }

  return secondaryStreamNames[language][stream];
}

export function streamsForSubject(subject: Subject | undefined, school?: SchoolRecord) {
  if (!subject || school?.stage !== 'secondary') {
    return [];
  }

  const enabledStreams = enabledSecondaryStreams(school);
  const specificStreams = secondarySubjectStreams[subject];

  if (!specificStreams) {
    return enabledStreams;
  }

  return enabledStreams.filter((stream) => specificStreams.includes(stream));
}

export function subjectsForSchool(school?: SchoolRecord) {
  if (school?.stage === 'primary') {
    return primarySubjects;
  }

  if (school?.stage === 'middle' || !school) {
    return middleSubjects;
  }

  return secondarySubjects.filter((subject) => !secondarySubjectStreams[subject] || streamsForSubject(subject, school).length > 0);
}

export function subjectMatchesStreams(subject: Subject, streams: SecondaryStream[]) {
  const specificStreams = secondarySubjectStreams[subject];
  return !specificStreams || streams.some((stream) => specificStreams.includes(stream));
}

export function subjectsForTeacherStreams(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[]) {
  if (school?.stage !== 'secondary') {
    return subjectsForSchool(school);
  }

  const availableStreams = selectedStreams.length > 0 ? selectedStreams : enabledSecondaryStreams(school);
  return secondarySubjects.filter((subject) => subjectMatchesStreams(subject, availableStreams));
}

export function subjectsForTeacherYears(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[], schoolYears: number[]) {
  if (schoolYears.length === 0) {
    return [];
  }

  const availableSubjects = subjectsForTeacherStreams(school, selectedStreams);

  if (school?.stage === 'primary' && schoolYears.some((year) => year === 1 || year === 2)) {
    return availableSubjects.filter((subject) => !primaryLowerYearExcludedSubjects.includes(subject));
  }

  return availableSubjects;
}

export function subjectsForTeacherYear(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[], schoolYear: number) {
  return subjectsForTeacherYears(school, selectedStreams, [schoolYear]);
}

export function subjectScopeLabel(language: Language, subject: Subject, school?: SchoolRecord) {
  if (school?.stage !== 'secondary') {
    return '';
  }

  const specificStreams = secondarySubjectStreams[subject];
  if (!specificStreams) {
    return tr(language, 'commonSubject');
  }

  const streams = streamsForSubject(subject, school);
  return streams.length > 0 ? streams.map((stream) => secondaryStreamLabel(language, stream)).join('، ') : '-';
}

export function subjectOptionLabel(language: Language, subject: Subject, school?: SchoolRecord) {
  const subjectName = subjectNames[language][subject];
  const scope = subjectScopeLabel(language, subject, school);

  return scope ? `${subjectName} - ${scope}` : subjectName;
}
