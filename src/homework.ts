import type {
  Exercise,
  HomeworkDifficulty,
  HomeworkFeedback,
  Language,
  PlatformData,
  PlatformUser,
  SecondaryStream,
  Subject
} from './types';
import { localeNames, subjectNames, tr } from './i18n';
import { exerciseMatchesStudent, secondaryStreams, subjectOrder } from './education';
import { scopedExercises } from './data';

export const homeworkDifficulties: HomeworkDifficulty[] = ['easy', 'medium', 'hard'];

export function homeworkDifficultyLabelKey(difficulty: HomeworkDifficulty) {
  if (difficulty === 'easy') {
    return 'easyHomework';
  }

  if (difficulty === 'medium') {
    return 'mediumHomework';
  }

  return 'hardHomework';
}

export function subjectIndex(subject: Subject) {
  const index = subjectOrder.indexOf(subject);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortExercises(left: Exercise, right: Exercise) {
  return (
    subjectIndex(left.subject) - subjectIndex(right.subject) ||
    (left.schoolYear ?? 0) - (right.schoolYear ?? 0) ||
    (left.stream ?? '').localeCompare(right.stream ?? '') ||
    (left.classGroup ?? '').localeCompare(right.classGroup ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    left.dueDate.localeCompare(right.dueDate) ||
    left.title.localeCompare(right.title)
  );
}

export function exerciseSubjectGroups(exercises: Exercise[]) {
  const grouped = new Map<Subject, Exercise[]>();

  [...exercises].sort(sortExercises).forEach((exercise) => {
    grouped.set(exercise.subject, [...(grouped.get(exercise.subject) ?? []), exercise]);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => subjectIndex(left) - subjectIndex(right))
    .map(([subject, subjectExercises]) => ({ subject, exercises: subjectExercises }));
}

export function streamIndex(stream: SecondaryStream | '') {
  if (!stream) {
    return Number.MAX_SAFE_INTEGER;
  }

  const index = secondaryStreams.indexOf(stream);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function yearIndex(year: number | '') {
  return year === '' ? Number.MAX_SAFE_INTEGER : year;
}

export function groupExercisesByTeacherTarget(exercises: Exercise[]) {
  const yearMap = new Map<number | '', Map<SecondaryStream | '', Map<string, Exercise[]>>>();

  [...exercises].sort(sortExercises).forEach((exercise) => {
    const year = exercise.schoolYear ?? '';
    const stream = exercise.stream ?? '';
    const classGroup = exercise.classGroup?.trim() || '-';
    const streamMap = yearMap.get(year) ?? new Map<SecondaryStream | '', Map<string, Exercise[]>>();
    const classMap = streamMap.get(stream) ?? new Map<string, Exercise[]>();
    classMap.set(classGroup, [...(classMap.get(classGroup) ?? []), exercise]);
    streamMap.set(stream, classMap);
    yearMap.set(year, streamMap);
  });

  return [...yearMap.entries()]
    .sort(([left], [right]) => yearIndex(left) - yearIndex(right))
    .map(([schoolYear, streamMap]) => {
      const streams = [...streamMap.entries()]
        .sort(([left], [right]) => streamIndex(left) - streamIndex(right))
        .map(([stream, classMap]) => ({
          stream,
          count: [...classMap.values()].reduce((total, groupExercises) => total + groupExercises.length, 0),
          classes: [...classMap.entries()]
            .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
            .map(([classGroup, classExercises]) => ({ classGroup, exercises: classExercises }))
        }));

      return {
        schoolYear,
        count: streams.reduce((total, streamGroup) => total + streamGroup.count, 0),
        streams
      };
    });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function weekBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isIsoInCurrentWeek(value?: string) {
  if (!value) {
    return false;
  }

  const date = dateFromIso(value);
  const { start, end } = weekBounds();
  return date >= start && date <= end;
}

export function weekRangeLabel(language: Language) {
  const { start, end } = weekBounds();
  const formatter = new Intl.DateTimeFormat(localeNames[language], { day: 'numeric', month: 'short' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function monthLabel(language: Language, key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(localeNames[language], { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function isPastExercise(exercise: Exercise) {
  return Boolean(exercise.dueDate && exercise.dueDate < todayIso());
}

export function groupExercisesByMonth(exercises: Exercise[], language: Language) {
  const grouped = new Map<string, Exercise[]>();

  [...exercises].sort((left, right) => right.dueDate.localeCompare(left.dueDate)).forEach((exercise) => {
    const date = exercise.dueDate || exercise.createdAt || todayIso();
    const key = date.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), exercise]);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, monthExercises]) => ({ key, label: monthLabel(language, key), exercises: monthExercises }));
}

export function targetStudentsForExercise(data: PlatformData, exercise: Exercise) {
  return data.users.filter(
    (user) =>
      user.role === 'student' &&
      user.status === 'active' &&
      exerciseMatchesStudent(exercise, user)
  );
}

export function isExerciseCompletedBy(data: PlatformData, studentId: string, exerciseId: string) {
  return Boolean(data.completions[studentId]?.includes(exerciseId));
}

export function completionDateFor(data: PlatformData, studentId: string, exercise: Exercise) {
  return data.completionDates[studentId]?.[exercise.id];
}

export function isExerciseCompletedThisWeek(data: PlatformData, studentId: string, exercise: Exercise) {
  if (!isExerciseCompletedBy(data, studentId, exercise.id)) {
    return false;
  }

  const completedAt = completionDateFor(data, studentId, exercise);
  return completedAt ? isIsoInCurrentWeek(completedAt) : isIsoInCurrentWeek(exercise.dueDate);
}

export function completionStatsForExercise(data: PlatformData, exercise: Exercise) {
  const students = targetStudentsForExercise(data, exercise);
  const completed = students.filter((student) => isExerciseCompletedBy(data, student.id, exercise.id)).length;
  const total = students.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, rate };
}

export function feedbackForStudent(data: PlatformData, studentId: string, exerciseId: string) {
  return data.feedback[studentId]?.[exerciseId];
}

export function feedbackStatsForExercise(data: PlatformData, exercise: Exercise) {
  const students = targetStudentsForExercise(data, exercise);
  const entries = students
    .map((student) => ({ student, feedback: feedbackForStudent(data, student.id, exercise.id) }))
    .filter((entry): entry is { student: PlatformUser; feedback: HomeworkFeedback } => Boolean(entry.feedback));
  const easy = entries.filter((entry) => entry.feedback.difficulty === 'easy').length;
  const medium = entries.filter((entry) => entry.feedback.difficulty === 'medium').length;
  const hard = entries.filter((entry) => entry.feedback.difficulty === 'hard').length;
  const notes = entries.filter((entry) => entry.feedback.note?.trim());

  return { easy, medium, hard, notes };
}

export function completionRateForExercises(data: PlatformData, exercises: Exercise[]) {
  return exercises.reduce(
    (summary, exercise) => {
      const stats = completionStatsForExercise(data, exercise);
      return {
        total: summary.total + stats.total,
        completed: summary.completed + stats.completed
      };
    },
    { total: 0, completed: 0 }
  );
}

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
