import * as Crypto from 'expo-crypto';
import {
  getPendingScans,
  getSyncState,
  markScanRejected,
  markScanSynced,
  markScanSyncing,
  resetScanToPending,
  setSyncState,
  upsertCommunityNetwork,
  type LocalScan,
} from '@/constants/db';
import { ApiError } from '../api/client';
import { getSyncStatus, pullSince, pushScansBatch } from '../api/sync';
import type { Attack, ScanConfig, ScanNetwork, ScanPayload } from '../api/types';

const LAST_SYNC_KEY = 'last_sync_at';
const PULL_PAGE_SIZE = 100;

function safeJsonParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

async function buildPayload(scan: LocalScan): Promise<ScanPayload> {
  const network: ScanNetwork = {
    ssid: scan.ssid ?? scan.network ?? '',
    bssid: scan.bssid ?? '',
  };
  const scan_config: ScanConfig = safeJsonParse(scan.scan_config, {
    modules: ['ALL'],
    duration: scan.scan_duration_sec ?? 0,
  });
  const attacks: Attack[] = safeJsonParse(scan.attacks, []);

  // Kolejność pól musi być dokładnie taka jak w dokumentacji (sekcja 1.6),
  // bo serwer weryfikuje payload_hash na tym samym porządku.
  const ordered: Omit<ScanPayload, 'payload_hash'> = {
    client_scan_id: scan.client_scan_id,
    network,
    safety_score: scan.safety_score ?? 0,
    scan_duration_sec: scan.scan_duration_sec ?? 0,
    scan_config,
    attacks,
    device_hardware_id: scan.device_hardware_id ?? '',
    firmware_version: scan.firmware_version ?? '',
    started_at: scan.started_at ?? new Date().toISOString(),
    completed_at: scan.completed_at ?? new Date().toISOString(),
  };

  const serialized = JSON.stringify(ordered);
  const payload_hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    serialized,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return { ...ordered, payload_hash };
}

export type PushResult = {
  attempted: number;
  created: number;
  duplicate: number;
  rejected: number;
  failedNetwork: boolean;
};

export async function pushPendingScans(): Promise<PushResult> {
  const result: PushResult = { attempted: 0, created: 0, duplicate: 0, rejected: 0, failedNetwork: false };

  const pending = getPendingScans(50);
  if (pending.length === 0) return result;

  const payloads: ScanPayload[] = [];
  const idByClientId = new Map<string, number>();

  for (const scan of pending) {
    const payload = await buildPayload(scan);
    markScanSyncing(scan.id, payload.payload_hash);
    payloads.push(payload);
    idByClientId.set(payload.client_scan_id, scan.id);
  }

  result.attempted = payloads.length;

  try {
    const res = await pushScansBatch(payloads);
    for (const entry of res.results) {
      const localId = idByClientId.get(entry.client_scan_id);
      if (localId == null) continue;
      if (entry.status === 'CREATED' && entry.server_scan_id) {
        markScanSynced(localId, entry.server_scan_id);
        result.created++;
      } else if (entry.error?.error === 'DUPLICATE' && entry.server_scan_id) {
        markScanSynced(localId, entry.server_scan_id);
        result.duplicate++;
      } else {
        markScanRejected(localId);
        result.rejected++;
      }
    }
  } catch (err) {
    const isPermanent = err instanceof ApiError && err.status === 422;
    for (const id of idByClientId.values()) {
      if (isPermanent) {
        markScanRejected(id);
        result.rejected++;
      } else {
        resetScanToPending(id);
      }
    }
    result.failedNetwork = !isPermanent;
    if (err instanceof ApiError && err.status === 401) throw err;
  }

  return result;
}

export type PullResult = {
  pages: number;
  upserted: number;
  serverTime: string | null;
};

export async function pullCommunity(): Promise<PullResult> {
  const result: PullResult = { pages: 0, upserted: 0, serverTime: null };

  let since = getSyncState(LAST_SYNC_KEY) ?? '1970-01-01T00:00:00Z';

  // Lekki check: czy jest cokolwiek do pobrania.
  try {
    const status = await getSyncStatus(since);
    if (status.updated_count === 0) {
      setSyncState(LAST_SYNC_KEY, status.server_time);
      result.serverTime = status.server_time;
      return result;
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw err;
    // Jeśli /sync/status nie działa, idź dalej i tak.
  }

  let hasMore = true;
  while (hasMore) {
    const page = await pullSince(since, PULL_PAGE_SIZE);
    result.pages++;
    for (const n of page.updated_networks ?? []) {
      upsertCommunityNetwork({
        id: n.id,
        ssid: n.ssid,
        bssid: n.bssid,
        avg_safety_score: n.avg_safety_score,
        total_scans: n.total_scans,
        last_scanned_at: n.last_scanned_at ?? null,
        raw: n,
      });
      result.upserted++;
    }
    hasMore = !!page.has_more;
    since = page.next_since ?? page.server_time;
    result.serverTime = page.server_time;
    if (!page.has_more) {
      setSyncState(LAST_SYNC_KEY, page.server_time);
    }
  }

  return result;
}

export async function runFullSync() {
  const push = await pushPendingScans();
  const pull = await pullCommunity();
  return { push, pull };
}

export function getLastSyncAt() {
  return getSyncState(LAST_SYNC_KEY);
}
