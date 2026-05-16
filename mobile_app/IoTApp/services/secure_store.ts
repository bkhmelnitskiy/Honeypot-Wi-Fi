import { sessionDelete, sessionGet, sessionSet } from '@/constants/db';

// Thin abstraction so we can swap SQLite-backed storage for
// expo-secure-store / Android Keystore later without touching call sites.

export const SecureStore = {
  get: (key: string) => sessionGet(key),
  set: (key: string, value: string) => sessionSet(key, value),
  delete: (key: string) => sessionDelete(key),
};
