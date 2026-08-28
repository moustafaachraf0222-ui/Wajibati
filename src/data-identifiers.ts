import type { PlatformUser, Role } from './types';

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

export function generateUniqueCode(existingCodes: string[]) {
  const usedCodes = new Set(existingCodes.map((code) => code.trim().toUpperCase()));

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = generateAccountCode();
    if (!usedCodes.has(code.toUpperCase())) {
      return code;
    }
  }

  throw new Error('Could not generate a unique 6-character account code.');
}

export function generateUniqueAccountCode(users: PlatformUser[]) {
  return generateUniqueCode(users.map((user) => user.password));
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

export function isEnglishName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  return /^[A-Za-z][A-Za-z\s'.-]*$/.test(trimmed);
}

export function generateSchoolEmail(name: string, role: Exclude<Role, 'admin' | 'director'>, domain: string, users: PlatformUser[]) {
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
