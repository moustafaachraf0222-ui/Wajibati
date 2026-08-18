import type { AccountEditState, PlatformData, PlatformUser, SecondaryStream, Subject } from './types';
import {
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  assignedYearSubjects,
  defaultClassGroups
} from './education';
import { getSchool } from './data-access';

export function makeAccountEditState(target: PlatformUser, data: PlatformData): AccountEditState {
  const school = getSchool(data, target);
  const classGroup = target.classGroup?.trim() ?? '';
  const classChoice = defaultClassGroups.includes(classGroup) ? classGroup : classGroup ? 'custom' : '1';
  const yearStreamClassGroups = assignedYearStreamClassGroups(target);
  const firstStreamByYear = Object.fromEntries(
    Object.entries(yearStreamClassGroups).map(([year, streams]) => [year, (Object.keys(streams)[0] as SecondaryStream | undefined) ?? ''])
  ) as Record<string, SecondaryStream | ''>;

  return {
    id: target.id,
    role: target.role,
    name: target.name,
    email: target.email,
    status: target.status,
    schoolName: school?.name ?? '',
    domain: school?.domain ?? '',
    stage: target.stage ?? school?.stage ?? 'middle',
    subject: target.subject ?? 'math',
    subjectsByYear: Object.fromEntries(
      Object.entries(assignedYearSubjects(target)).map(([year, subject]) => [year, subject])
    ) as Record<string, Subject>,
    schoolYear: target.schoolYear ?? 1,
    classChoice,
    customClassGroup: classChoice === 'custom' ? classGroup : '',
    stream: target.stream ?? '',
    schoolYears: assignedSchoolYears(target).length > 0 ? assignedSchoolYears(target) : [target.schoolYear ?? 1],
    yearClassGroups: assignedYearClassGroups(target),
    yearStreamClassGroups,
    streamChoiceByYear: firstStreamByYear,
    classChoiceByYear: {},
    customClassByYear: {}
  };
}
