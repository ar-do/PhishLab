import type { Locale } from '@/i18n/I18nProvider';

export function formatPercent(value: number | null, locale: Locale): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDateTime(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(new Date(iso));
}

/** REP-01: Time-to-Report in einer Form, die man vorlesen kann. */
export function formatDuration(seconds: number | null, locale: Locale): string {
  if (seconds === null) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute' }).format(minutes);
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'hour',
    maximumFractionDigits: 1,
  }).format(minutes / 60);
}
