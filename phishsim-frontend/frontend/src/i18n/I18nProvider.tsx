import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { de, type Dictionary } from './de';
import { en } from './en';

export type Locale = 'de' | 'en';

const DICTIONARIES: Record<Locale, Dictionary> = { de, en };
const STORAGE_KEY = 'phishsim.locale';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  /** Ersetzt {platzhalter} in einem Text. */
  fill: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'de' || stored === 'en') return stored;
  return navigator.language.startsWith('en') ? 'en' : 'de';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  /**
   * FE-09 / WCAG 3.1.1: Das lang-Attribut muss der angezeigten Sprache
   * folgen, sonst liest der Screenreader mit falscher Aussprache vor.
   */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const fill = useCallback(
    (template: string, values: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? String(values[key]) : match,
      ),
    [],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale], fill }),
    [locale, setLocale, fill],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n muss innerhalb von I18nProvider verwendet werden.');
  return context;
}
