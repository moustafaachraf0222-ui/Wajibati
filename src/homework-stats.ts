import type { Exercise, HomeworkFeedback, PlatformData, PlatformUser } from './types';
import { exerciseMatchesStudent } from './education';
import { isIsoInCurrentWeek } from './homework-dates';

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
