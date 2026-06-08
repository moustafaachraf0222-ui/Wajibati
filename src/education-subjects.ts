import type { Language, PlatformUser, SchoolRecord, SecondaryStream, Subject, YearStreamClassGroups } from './types';
import { schoolYearLabel, secondaryStreamNames, subjectNames, tr } from './i18n';
import {
  firstYearSecondaryStreams,
  middleSubjects,
  primaryLowerYearExcludedSubjects,
  primarySpecialistSubjects,
  primarySubjects,
  primaryTeacherSubjects,
  secondarySubjectStreams,
  secondarySubjects
} from './education-constants';
import { assignedSchoolYears, normalizeYearStreamClassGroups } from './education-assignments';

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

function subjectIsAvailableForPrimaryYear(subject: Subject, schoolYear: number | undefined) {
  return !(schoolYear && (schoolYear === 1 || schoolYear === 2) && primaryLowerYearExcludedSubjects.includes(subject));
}

export function primaryGeneralSubjectsForYear(schoolYear: number | undefined) {
  return primarySubjects.filter((subject) => !primarySpecialistSubjects.includes(subject) && subjectIsAvailableForPrimaryYear(subject, schoolYear));
}

function isPrimaryGeneralTeacherSubject(subject: Subject | undefined, schoolYear: number | undefined) {
  return Boolean(subject && primaryGeneralSubjectsForYear(schoolYear).includes(subject));
}

export function primaryTeacherSubjectName(language: Language, subject: Subject) {
  if (subject === 'arabic') {
    return tr(language, 'primaryLiteratureTeacher');
  }

  if (subject === 'french') {
    return tr(language, 'primaryFrenchTeacher');
  }

  if (subject === 'tamazight') {
    return tr(language, 'primaryTamazightTeacher');
  }

  if (subject === 'physical_education') {
    return tr(language, 'primarySportTeacher');
  }

  return subjectNames[language][subject];
}

export function teacherSubjectName(language: Language, user: PlatformUser, subject: Subject, schoolYear?: number) {
  if (user.stage === 'primary' && isPrimaryGeneralTeacherSubject(subject, schoolYear)) {
    return tr(language, 'primaryLiteratureTeacher');
  }

  if (user.stage === 'primary' && primaryTeacherSubjects.includes(subject)) {
    return primaryTeacherSubjectName(language, subject);
  }

  return subjectNames[language][subject];
}

export function teacherAllowedSubjectsForYear(user: PlatformUser, schoolYear: number | undefined) {
  const subject = teacherSubjectForYear(user, schoolYear);
  if (!subject) {
    return [];
  }

  if (user.stage !== 'primary') {
    return [subject];
  }

  if (isPrimaryGeneralTeacherSubject(subject, schoolYear)) {
    return primaryGeneralSubjectsForYear(schoolYear);
  }

  return subjectIsAvailableForPrimaryYear(subject, schoolYear) ? [subject] : [];
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
    return teacherSubjectName(language, user, uniqueSubjects[0]);
  }

  return subjectEntries
    .map(([year, subject]) => `${schoolYearLabel(language, user.stage, Number(year))}: ${teacherSubjectName(language, user, subject, Number(year))}`)
    .join(' | ');
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

  if (school?.stage === 'primary') {
    return schoolYears.some((year) => year === 1 || year === 2)
      ? primaryTeacherSubjects.filter((subject) => !primaryLowerYearExcludedSubjects.includes(subject))
      : primaryTeacherSubjects;
  }

  const availableSubjects = subjectsForTeacherStreams(school, selectedStreams);
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
  if (school?.stage === 'primary' && primaryTeacherSubjects.includes(subject)) {
    return primaryTeacherSubjectName(language, subject);
  }

  const subjectName = subjectNames[language][subject];
  const scope = subjectScopeLabel(language, subject, school);

  return scope ? `${subjectName} - ${scope}` : subjectName;
}
