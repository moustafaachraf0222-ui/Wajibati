export type SeenDomain = 'absences' | 'labs' | 'canteen' | 'labRepairs' | 'transferOutcomes';

export const ALL_SEEN_DOMAINS: SeenDomain[] = ['absences', 'labs', 'canteen', 'labRepairs', 'transferOutcomes'];

const SEEN_STORAGE_KEY = 'wajibati.notification-seen-at';
export const SEEN_CHANGED_EVENT = 'wajibati:seen-changed';

function readSeenMap(): Partial<Record<SeenDomain, string>> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<SeenDomain, string>>) : {};
  } catch {
    return {};
  }
}

export function seenAt(domain: SeenDomain): string | null {
  return readSeenMap()[domain] ?? null;
}

export function markSeenAt(domain: SeenDomain) {
  const next = { ...readSeenMap(), [domain]: new Date().toISOString() };
  localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SEEN_CHANGED_EVENT));
}

export function markAllDomainsSeen() {
  ALL_SEEN_DOMAINS.forEach((domain) => markSeenAt(domain));
}

export function seenThreshold(domain: SeenDomain) {
  const seen = seenAt(domain);
  if (seen) {
    return seen;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}