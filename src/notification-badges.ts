import type { PlatformData, PlatformUser } from './types';
import { seenAt, type SeenDomain } from './notification-seen';

function startOfTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function thresholdFor(domain: SeenDomain) {
  return seenAt(domain) ?? startOfTodayIso();
}

export function absenceNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = thresholdFor('absences');
  return data.absenceReports.filter((report) => report.schoolId === currentUser.schoolId && report.createdAt > threshold).length;
}

export function labNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = thresholdFor('labs');
  return data.labFaultReports.filter(
    (fault) => fault.schoolId === currentUser.schoolId && fault.status === 'open' && fault.reportedAt > threshold
  ).length;
}

export function canteenNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = thresholdFor('canteen');
  return data.canteenMealScans.filter(
    (scan) => scan.schoolId === currentUser.schoolId && scan.result === 'allowed' && scan.scannedAt > threshold
  ).length;
}

export function labRepairNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'lab') {
    return 0;
  }

  const labIds = new Set(data.laboratories.filter((lab) => lab.supervisorId === currentUser.id).map((lab) => lab.id));
  const threshold = thresholdFor('labRepairs');
  return data.labFaultReports.filter(
    (fault) => fault.status === 'repaired' && labIds.has(fault.labId) && (fault.repairDate ?? fault.updatedAt ?? '') > threshold
  ).length;
}

export function transferOutcomeNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = thresholdFor('transferOutcomes');
  return data.transferRequests.filter(
    (request) => request.fromSchoolId === currentUser.schoolId && request.status !== 'pending' && (request.resolvedAt ?? '') > threshold
  ).length;
}