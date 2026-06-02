import type { Exercise, Language, PlatformData, PlatformUser, Subject } from './types';
import { subjectNames, tr } from './i18n';
import { scopedExercises } from './data';
import { isIsoInCurrentWeek, weekRangeLabel } from './homework-dates';
import { completionRateForExercises } from './homework-stats';

export function topTeacherByActivity(data: PlatformData, exercises: Exercise[], language: Language) {
  const counts = new Map<string, number>();
  exercises.forEach((exercise) => counts.set(exercise.teacherId, (counts.get(exercise.teacherId) ?? 0) + 1));
  const [teacherId, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
  const teacher = data.users.find((user) => user.id === teacherId);

  return {
    name: teacher ? teacher.name : tr(language, 'noTeacherActivity'),
    count: count ?? 0
  };
}

export function topSubjectByHomework(exercises: Exercise[], language: Language) {
  const counts = new Map<Subject, number>();
  exercises.forEach((exercise) => counts.set(exercise.subject, (counts.get(exercise.subject) ?? 0) + 1));
  const [subject, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

  return {
    name: subject ? subjectNames[language][subject] : tr(language, 'noSubjectActivity'),
    count: count ?? 0
  };
}

export function reportLinesForDirector(data: PlatformData, currentUser: PlatformUser, language: Language) {
  const exercises = scopedExercises(data, currentUser);
  const weeklyExercises = exercises.filter((exercise) => isIsoInCurrentWeek(exercise.dueDate));
  const weeklyRate = completionRateForExercises(data, weeklyExercises);
  const overallRate = completionRateForExercises(data, exercises);
  const topTeacher = topTeacherByActivity(data, exercises, language);
  const topSubject = topSubjectByHomework(exercises, language);
  const percent = weeklyRate.total > 0 ? Math.round((weeklyRate.completed / weeklyRate.total) * 100) : 0;
  const overallPercent = overallRate.total > 0 ? Math.round((overallRate.completed / overallRate.total) * 100) : 0;

  return [
    `${tr(language, 'weeklyReportSummary')}: ${weekRangeLabel(language)}`,
    `${tr(language, 'totalExercises')}: ${weeklyExercises.length}`,
    `${tr(language, 'topTeacher')}: ${topTeacher.name} (${topTeacher.count})`,
    `${tr(language, 'topSubject')}: ${topSubject.name} (${topSubject.count})`,
    `${tr(language, 'completionRate')}: ${percent}%`,
    `${tr(language, 'generalCompletion')}: ${overallPercent}%`
  ];
}
