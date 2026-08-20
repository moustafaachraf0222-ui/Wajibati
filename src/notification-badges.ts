import type { PlatformData, PlatformUser } from './types';
import { seenAt } from './notification-seen';

export function absenceNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const seen = seenAt('absences');
  return data.absenceReports.filter((report) => report.schoolId === currentUser.schoolId && (!seen || report.createdAt > seen)).length;
}

export function labNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'lab') {
    return 0;
  }

  const labIds = new Set(data.laboratories.filter((lab) => lab.supervisorId === currentUser.id).map((lab) => lab.id));
  const seen = seenAt('labs');
  return data.labFaultReports.filter(
    (fault) => fault.status === 'open' && labIds.has(fault.labId) && (!seen || fault.reportedAt > seen)
  ).length;
}

export function canteenNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const seen = seenAt('canteen');
  return data.canteenMealScans.filter(
    (scan) => scan.schoolId === currentUser.schoolId && scan.result === 'allowed' && (!seen || scan.scannedAt > seen)
  ).length;
}