import type { Exercise, Language } from './types';
import { localeNames } from './i18n';

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
