import { localeNames } from './i18n';
import type { Language } from './types';

export function formatDateTime(language: Language, value?: string | Date | null) {
  if (!value) {
    return '-';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
