export const HONEYPOT_DEVICE_NAME = 'honeypot';

export const SERVICE_UUID = 'af1d1aa1-b82f-427b-9310-ab69162fe860';
export const SSID_CHAR_UUID = '60d1e593-768b-4a61-b0b4-503c32a09364';
export const SECURITY_CHAR_UUID = '10a1e240-345e-437e-befd-1641c768fb93';

export enum SecurityLevel {
  None = 0,
  Unknown = 1,
  Dangerous = 2,
  Poor = 3,
  Ok = 4,
}

export enum SecurityEvent {
  None = 0,
  Foo = 1,
  Bar = 2,
  Baz = 3,
}

export interface SecurityFrame {
  level: SecurityLevel;
  event: SecurityEvent;
  seconds: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';
