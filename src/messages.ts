import type { Announcement, PlatformUser, TeacherNote } from './types';

const ANNOUNCEMENT_ACTIVE_MS = 72 * 60 * 60 * 1000;
const NOTE_ACTIVE_MS = 72 * 60 * 60 * 1000;
const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

export type MessageStatus = 'active' | 'expiring' | 'archived';

export function announcementExpiresAt(announcement: Announcement) {
  const createdAt = Date.parse(announcement.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + ANNOUNCEMENT_ACTIVE_MS);
}

export function isAnnouncementArchived(announcement: Announcement, now = Date.now()) {
  const expiresAt = announcementExpiresAt(announcement);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

export function canViewAnnouncementArchive(user: PlatformUser) {
  return user.role === 'admin' || user.role === 'director';
}

export function noteExpiresAt(note: TeacherNote) {
  const createdAt = Date.parse(note.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + NOTE_ACTIVE_MS);
}

export function isNoteArchived(note: TeacherNote, now = Date.now()) {
  const expiresAt = noteExpiresAt(note);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

export function announcementStatus(announcement: Announcement, now = Date.now()): MessageStatus {
  const expiresAt = announcementExpiresAt(announcement);
  if (!expiresAt) {
    return 'active';
  }
  const remaining = expiresAt.getTime() - now;
  if (remaining <= 0) {
    return 'archived';
  }
  if (remaining <= EXPIRING_SOON_MS) {
    return 'expiring';
  }
  return 'active';
}

export function noteStatus(note: TeacherNote, now = Date.now()): MessageStatus {
  const expiresAt = noteExpiresAt(note);
  if (!expiresAt) {
    return 'active';
  }
  const remaining = expiresAt.getTime() - now;
  if (remaining <= 0) {
    return 'archived';
  }
  if (remaining <= EXPIRING_SOON_MS) {
    return 'expiring';
  }
  return 'active';
}
