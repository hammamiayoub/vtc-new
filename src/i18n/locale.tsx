import React, { createContext, useContext, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type Locale = 'fr' | 'en';

const STORAGE_KEY = 'tunidrive-locale';

const ROUTE_PAIRS: { fr: string; en: string }[] = [
  { fr: '/', en: '/en' },
  { fr: '/a-propos', en: '/en/about' },
  { fr: '/blog', en: '/en/blog' },
  { fr: '/transport-colis-europe-tunisie', en: '/en/parcel-europe-tunisia' },
  { fr: '/vtc-tunisie', en: '/en/vtc-tunisia' },
  { fr: '/signup', en: '/en/signup' },
  { fr: '/client-signup', en: '/en/client-signup' },
  { fr: '/login', en: '/en/login' },
  { fr: '/driver-login', en: '/en/driver-login' },
  { fr: '/client-login', en: '/en/client-login' },
  { fr: '/reset-password', en: '/en/reset-password' },
  { fr: '/terms-of-service', en: '/en/terms-of-service' },
  { fr: '/privacy-policy', en: '/en/privacy-policy' },
  { fr: '/client-dashboard', en: '/en/client-dashboard' },
];

export function readStoredLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'en' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore private mode */
  }
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function splitLocalePath(pathname: string): { locale: Locale; logicalPath: string } {
  const path = normalizePath(pathname);
  if (path === '/en' || path.startsWith('/en/')) {
    if (path === '/en/blog' || path.startsWith('/en/blog/')) {
      return { locale: 'en', logicalPath: path.slice(3) || '/blog' };
    }
    const pair = ROUTE_PAIRS.find((item) => item.en === path);
    if (pair) return { locale: 'en', logicalPath: pair.fr };
    return { locale: 'en', logicalPath: '/__unknown__' };
  }
  return { locale: 'fr', logicalPath: path };
}

export function isTranslatablePublicPath(logicalPath: string): boolean {
  if (logicalPath.startsWith('/blog')) return true;
  return ROUTE_PAIRS.some((item) => item.fr === logicalPath);
}

export function localizePath(logicalHref: string, locale: Locale): string {
  const hashIndex = logicalHref.indexOf('#');
  const hash = hashIndex >= 0 ? logicalHref.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? logicalHref.slice(0, hashIndex) : logicalHref;
  const queryIndex = withoutHash.indexOf('?');
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  const path = normalizePath(queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash);

  if (path.startsWith('/blog/')) {
    const base = locale === 'en' ? `/en${path}` : path;
    return `${base}${search}${hash}`;
  }

  const pair = ROUTE_PAIRS.find((item) => item.fr === path);
  if (!pair) return `${path}${search}${hash}`;
  const base = locale === 'en' ? pair.en : pair.fr;
  return `${base}${search}${hash}`;
}

export function alternateUrls(logicalPath: string): { fr: string; en: string } | null {
  const path = logicalPath.startsWith('/blog/') ? logicalPath : logicalPath;
  if (path.startsWith('/blog/')) {
    return { fr: path, en: `/en${path}` };
  }
  const pair = ROUTE_PAIRS.find((item) => item.fr === path);
  if (!pair) return null;
  return { fr: pair.fr, en: pair.en };
}

interface LocaleContextValue {
  locale: Locale;
  logicalPath: string;
  setLocale: (locale: Locale) => void;
  href: (logicalHref: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, logicalPath } = splitLocalePath(location.pathname);

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'fr';
  }, [locale]);

  useLayoutEffect(() => {
    const stored = readStoredLocale();
    if (stored !== 'en' || locale !== 'fr' || !isTranslatablePublicPath(logicalPath)) return;
    navigate(localizePath(`${logicalPath}${location.search}${location.hash}`, 'en'), { replace: true });
  }, [locale, logicalPath, location.hash, location.search, navigate]);

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    storeLocale(next);
    const targetLogical = isTranslatablePublicPath(logicalPath) ? logicalPath : '/';
    navigate(localizePath(`${targetLogical}${location.search}${location.hash}`, next));
  };

  const href = (logicalHref: string) => localizePath(logicalHref, locale);

  return (
    <LocaleContext.Provider value={{ locale, logicalPath, setLocale, href }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    return {
      locale: 'fr',
      logicalPath: '/',
      setLocale: () => undefined,
      href: (logicalHref: string) => logicalHref,
    };
  }
  return value;
}

export function LanguageSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locale, setLocale } = useLocale();
  const active =
    tone === 'dark' ? 'bg-white text-black' : 'bg-black text-white';
  const idle =
    tone === 'dark'
      ? 'text-gray-300 hover:text-white'
      : 'text-gray-600 hover:text-gray-900';

  return (
    <div
      className={`inline-flex items-center rounded-full p-0.5 text-xs font-semibold ${
        tone === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-300 shadow-sm'
      }`}
      role="group"
      aria-label={locale === 'en' ? 'Language' : 'Langue'}
    >
      <button
        type="button"
        onClick={() => setLocale('fr')}
        className={`px-2.5 py-1 rounded-full transition-colors ${locale === 'fr' ? active : idle}`}
        aria-pressed={locale === 'fr'}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 rounded-full transition-colors ${locale === 'en' ? active : idle}`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
