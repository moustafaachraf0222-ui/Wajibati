import type { PlatformData, PlatformUser } from './types';
import { seenThreshold } from './notification-seen';

export function absenceNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = seenThreshold(currentUser.id, 'absences');
  return data.absenceReports.filter((report) => report.schoolId === currentUser.schoolId && report.createdAt > threshold).length;
}

export function labNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = seenThreshold(currentUser.id, 'labs');
  return data.labFaultReports.filter(
    (fault) => fault.schoolId === currentUser.schoolId && fault.status === 'open' && fault.reportedAt > threshold
  ).length;
}

export function canteenNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = seenThreshold(currentUser.id, 'canteen');
  return data.canteenMealScans.filter(
    (scan) => scan.schoolId === currentUser.schoolId && scan.result === 'allowed' && scan.scannedAt > threshold
  ).length;
}

export function labRepairNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'lab') {
    return 0;
  }

  const labIds = new Set(data.laboratories.filter((lab) => lab.supervisorId === currentUser.id).map((lab) => lab.id));
  const threshold = seenThreshold(currentUser.id, 'labRepairs');
  return data.labFaultReports.filter(
    (fault) => fault.status === 'repaired' && labIds.has(fault.labId) && (fault.repairDate ?? fault.updatedAt ?? '') > threshold
  ).length;
}

export function announcementNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role === 'director' || !currentUser.schoolId) {
    return 0;
  }

  const threshold = seenThreshold(currentUser.id, 'announcements');
  return data.announcements.filter((announcement) => announcement.schoolId === currentUser.schoolId && announcement.createdAt > threshold).length;
}

export function transferOutcomeNotificationCount(data: PlatformData, currentUser: PlatformUser) {
  if (currentUser.role !== 'director') {
    return 0;
  }

  const threshold = seenThreshold(currentUser.id, 'transferOutcomes');
  return data.transferRequests.filter(
    (request) => request.fromSchoolId === currentUser.schoolId && request.status !== 'pending' && (request.resolvedAt ?? '') > threshold
  ).length;
}