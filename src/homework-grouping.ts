import type { Exercise, SecondaryStream, Subject } from './types';
import { secondaryStreams, subjectOrder } from './education';

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
