// Central runtime config. Override API_BASE_URL with EXPO_PUBLIC_API_BASE_URL
// at build time (.env) if you point the app at a different environment.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://209-250-226-32.sslip.io/api/v1';

export const REQUEST_TIMEOUT_MS = 15_000;
