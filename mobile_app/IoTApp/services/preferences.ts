import { sessionGet, sessionSet } from '@/constants/db';

export type AppPrefs = {
  theme: 'system' | 'light' | 'dark';
  notifications: boolean;
  language: 'en' | 'pl';
};

export type ScanPrefs = {
  default_duration_sec: number;
  modules: string[];
};

const KEYS = { app: 'prefs.app', scan: 'prefs.scan' };

const DEFAULT_APP: AppPrefs = { theme: 'system', notifications: true, language: 'en' };
const DEFAULT_SCAN: ScanPrefs = {
  default_duration_sec: 60,
  modules: ['ARP_SPOOFING', 'DNS_SPOOFING', 'EVIL_TWIN', 'DEAUTHENTICATION'],
};

function readJSON<T>(key: string, fallback: T): T {
  const raw = sessionGet(key);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function getAppPrefs(): AppPrefs { return readJSON(KEYS.app, DEFAULT_APP); }
export function setAppPrefs(p: AppPrefs) { sessionSet(KEYS.app, JSON.stringify(p)); }

export function getScanPrefs(): ScanPrefs { return readJSON(KEYS.scan, DEFAULT_SCAN); }
export function setScanPrefs(p: ScanPrefs) { sessionSet(KEYS.scan, JSON.stringify(p)); }
