import type { Announcement, PlatformUser, TeacherNote } from './types';

const ANNOUNCEMENT_ACTIVE_MS = 72 * 60 * 60 * 1000;
const NOTE_ACTIVE_MS = 72 * 60 * 60 * 1000;

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
