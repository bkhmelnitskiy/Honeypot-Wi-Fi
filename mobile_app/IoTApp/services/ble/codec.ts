import { Buffer } from 'buffer';
import { SecurityEvent, SecurityFrame, SecurityLevel } from './constants';

export function encodeSSID(ssid: string): string {
  return Buffer.from(ssid, 'utf8').toString('base64');
}

export function decodeSecurity(b64: string): SecurityFrame {
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 4) {
    throw new Error(`security frame too short: ${buf.length} bytes`);
  }
  const seconds = buf.readInt16BE(2);
  return {
    level: buf[0] as SecurityLevel,
    event: buf[1] as SecurityEvent,
    seconds,
  };
}
