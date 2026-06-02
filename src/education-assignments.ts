import type { PlatformUser, SecondaryStream, YearStreamClassGroups } from './types';
import { secondaryStreams } from './education-constants';

export function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function parseClassGroups(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[,،;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

export function normalizeClassGroup(value: string) {
  return value.trim();
}

export function normalizeYearClassGroups(assignments: Record<string, string[]> | undefined) {
  const normalized: Record<string, string[]> = {};

  Object.entries(assignments ?? {}).forEach(([year, groups]) => {
    const yearNumber = Number(year);
    const cleanGroups = parseClassGroups(groups.join(','));
    if (Number.isInteger(yearNumber) && yearNumber > 0 && cleanGroups.length > 0) {
      normalized[String(yearNumber)] = cleanGroups;
    }
  });

  return normalized;
}

export function normalizeYearStreamClassGroups(assignments: YearStreamClassGroups | undefined) {
  const normalized: YearStreamClassGroups = {};

  Object.entries(assignments ?? {}).forEach(([year, streams]) => {
    const yearNumber = Number(year);
    if (!Number.isInteger(yearNumber) || yearNumber <= 0) {
      return;
    }

    const normalizedStreams: Partial<Record<SecondaryStream, string[]>> = {};

    Object.entries(streams ?? {}).forEach(([stream, groups]) => {
      if (!secondaryStreams.includes(stream as SecondaryStream)) {
        return;
      }

      const cleanGroups = parseClassGroups((groups ?? []).join(','));
      if (cleanGroups.length > 0) {
        normalizedStreams[stream as SecondaryStream] = cleanGroups;
      }
    });

    if (Object.keys(normalizedStreams).length > 0) {
      normalized[String(yearNumber)] = normalizedStreams;
    }
  });

  return normalized;
}

export function assignedYearStreamClassGroups(user: PlatformUser) {
  return normalizeYearStreamClassGroups(user.yearStreamClassGroups);
}

export function assignedSchoolYears(user: PlatformUser) {
  const streamGroupedYears = uniqueNumbers(Object.keys(assignedYearStreamClassGroups(user)).map(Number));
  if (streamGroupedYears.length > 0) {
    return streamGroupedYears;
  }

  const groupedYears = uniqueNumbers(Object.keys(normalizeYearClassGroups(user.yearClassGroups)).map(Number));
  if (groupedYears.length > 0) {
    return groupedYears;
  }

  const years = uniqueNumbers((user.schoolYears ?? []).filter((year) => Number.isInteger(year) && year > 0));
  if (years.length > 0) {
    return years;
  }

  return user.schoolYear ? [user.schoolYear] : [];
}

export function assignedYearClassGroups(user: PlatformUser) {
  const grouped = normalizeYearClassGroups(user.yearClassGroups);
  if (Object.keys(grouped).length > 0) {
    return grouped;
  }

  const years = assignedSchoolYears(user);
  const groups = parseClassGroups((user.classGroups ?? []).join(','));

  if (years.length > 0 && groups.length > 0) {
    return Object.fromEntries(years.map((year) => [String(year), groups]));
  }

  if (user.schoolYear && user.classGroup?.trim()) {
    return { [String(user.schoolYear)]: [user.classGroup.trim()] };
  }

  return {};
}

export function assignedClassGroups(user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamGroupedClasses = parseClassGroups(
    Object.values(streamGrouped)
      .flatMap((streams) => Object.values(streams).flat())
      .join(',')
  );
  if (streamGroupedClasses.length > 0) {
    return streamGroupedClasses;
  }

  const grouped = normalizeYearClassGroups(user.yearClassGroups);
  const groupedClasses = parseClassGroups(Object.values(grouped).flat().join(','));
  if (groupedClasses.length > 0) {
    return groupedClasses;
  }

  const groups = parseClassGroups((user.classGroups ?? []).join(','));
  if (groups.length > 0) {
    return groups;
  }

  return user.classGroup?.trim() ? [user.classGroup.trim()] : [];
}
