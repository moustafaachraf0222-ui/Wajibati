import type { Accent, Language, PlatformUser, RememberedAccount, Role, Theme } from './types';
import { ACCENT_KEY, LANGUAGE_KEY, REMEMBERED_ACCOUNTS_KEY, THEME_KEY } from './data-constants';

export function isLanguage(value: string | null): value is Language {
  return value === 'ar' || value === 'fr' || value === 'en';
}

export function loadLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : 'ar';
}

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return isTheme(stored) ? stored : 'light';
}

export function isAccent(value: string | null): value is Accent {
  return value === 'green' || value === 'navy' || value === 'teal' || value === 'amber' || value === 'crimson' || value === 'violet';
}

export function loadAccent(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY);
  return isAccent(stored) ? stored : 'green';
}

export function isRole(value: unknown): value is Role {
  return (
    value === 'admin' ||
    value === 'director' ||
    value === 'supervisor' ||
    value === 'lab' ||
    value === 'canteen' ||
    value === 'teacher' ||
    value === 'student'
  );
}

export function loadRememberedAccounts(): RememberedAccount[] {
  try {
    const stored = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();

    return parsed
      .filter(
        (item): item is RememberedAccount =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.email === 'string' &&
          isRole(item.role)
      )
      .filter((item) => {
        const idKey = `id:${item.id}`;
        const emailKey = `email:${item.email.toLowerCase()}`;
        if (seen.has(idKey) || seen.has(emailKey)) {
          return false;
        }
        seen.add(idKey);
        seen.add(emailKey);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberedAccountFromUser(account: PlatformUser): RememberedAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };
}

export function mergeRememberedAccount(previous: RememberedAccount[], account: PlatformUser) {
  const nextAccount = rememberedAccountFromUser(account);
  return [
    nextAccount,
    ...previous.filter((item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase())
  ].slice(0, 8);
}

export function rememberedAccountListsEqual(left: RememberedAccount[], right: RememberedAccount[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function saveRememberedAccounts(accounts: RememberedAccount[]) {
  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function rememberStoredAccount(account: PlatformUser) {
  const next = mergeRememberedAccount(loadRememberedAccounts(), account);
  saveRememberedAccounts(next);
  return next;
}

export function forgetStoredAccount(account: PlatformUser) {
  const next = loadRememberedAccounts().filter(
    (item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase()
  );
  saveRememberedAccounts(next);
  return next;
}

export function pruneRememberedAccounts(users: PlatformUser[]) {
  const next = loadRememberedAccounts().filter((remembered) =>
    users.some((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase())
  );

  saveRememberedAccounts(next);
  return next;
}
