import { apiFetch } from './client';
import type { BatchResponse, ScanPayload, SyncSinceResponse, SyncStatusResponse } from './types';

export function getSyncStatus(since: string) {
  return apiFetch<SyncStatusResponse>(`/sync/status?since=${encodeURIComponent(since)}`);
}

export function pullSince(since: string, limit = 100) {
  return apiFetch<SyncSinceResponse>(`/sync/${encodeURIComponent(since)}?limit=${limit}`);
}

export function pushScan(payload: ScanPayload) {
  return apiFetch<{ server_scan_id: string; network_id: string; accepted: boolean }>('/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function pushScansBatch(scans: ScanPayload[]) {
  if (scans.length > 50) throw new Error('Batch może zawierać maksymalnie 50 skanów');
  return apiFetch<BatchResponse>('/sync/batch', {
    method: 'POST',
    body: JSON.stringify({ scans }),
  });
}
