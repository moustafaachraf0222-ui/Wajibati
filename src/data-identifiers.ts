import type { PlatformUser } from './types';

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function randomIndex(max: number) {
  if (max <= 0) {
    return 0;
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function generateAccountCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const alphabet = `${letters}${digits}`;
  const characters = [
    letters[randomIndex(letters.length)],
    digits[randomIndex(digits.length)],
    ...Array.from({ length: 4 }, () => alphabet[randomIndex(alphabet.length)])
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

export function normalizeEmailDomain(domain: string) {
  return domain.replace(/^@/, '').trim().toLowerCase();
}

export function compactEmailLocalPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function generateSchoolEmail(name: string, role: 'supervisor' | 'teacher' | 'student', domain: string, users: PlatformUser[]) {
  const emailDomain = normalizeEmailDomain(domain);
  const localBase = compactEmailLocalPart(name) || role;
  const usedEmails = new Set(users.map((user) => user.email.toLowerCase()));
  let suffix = 0;
  let email = `${localBase}@${emailDomain}`;

  while (usedEmails.has(email.toLowerCase())) {
    suffix += 1;
    email = `${localBase}${suffix}@${emailDomain}`;
  }

  return email;
}
