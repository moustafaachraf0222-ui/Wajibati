export type SeenDomain =
  | 'absences'
  | 'labs'
  | 'canteen'
  | 'labRepairs'
  | 'transferOutcomes'
  | 'announcements'
  | 'studentExercises'
  | 'studentNotes';

export const ALL_SEEN_DOMAINS: SeenDomain[] = [
  'absences',
  'labs',
  'canteen',
  'labRepairs',
  'transferOutcomes',
  'announcements',
  'studentExercises',
  'studentNotes'
];

export const SEEN_CHANGED_EVENT = 'wajibati:seen-changed';

function storageKeyFor(userId: string) {
  return `wajibati.notification-seen-at.${userId}`;
}

function readSeenMap(userId: string): Partial<Record<SeenDomain, string>> {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    return raw ? (JSON.parse(raw) as Partial<Record<SeenDomain, string>>) : {};
  } catch {
    return {};
  }
}

export function seenAt(userId: string, domain: SeenDomain): string | null {
  return readSeenMap(userId)[domain] ?? null;
}

export function markSeenAt(userId: string, domain: SeenDomain) {
  const next = { ...readSeenMap(userId), [domain]: new Date().toISOString() };
  localStorage.setItem(storageKeyFor(userId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SEEN_CHANGED_EVENT));
}

export function markAllDomainsSeen(userId: string) {
  ALL_SEEN_DOMAINS.forEach((domain) => markSeenAt(userId, domain));
}

export function seenThreshold(userId: string, domain: SeenDomain) {
  const seen = seenAt(userId, domain);
  if (seen) {
    return seen;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}