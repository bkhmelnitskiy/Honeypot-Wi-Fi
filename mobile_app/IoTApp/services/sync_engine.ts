import {
  getAttacksForScan,
  getPendingUploads,
  getScanByClientId,
  markScanUploaded,
  removeQueueRow,
  updateQueueStatus,
  type Attack,
  type Scan,
} from '@/constants/db';
import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync } from 'expo-crypto';
import { api } from './api';

type SyncSummary = {
  attempted: number;
  uploaded: number;
  failed: number;
  errors: { client_scan_id: string; error: string }[];
};

export async function syncPending(maxBatchSize = 25): Promise<SyncSummary> {
  const rows = getPendingUploads(maxBatchSize);
  console.error(rows)
  const summary: SyncSummary = { attempted: rows.length, uploaded: 0, failed: 0, errors: [] };
  if (rows.length === 0) return summary;

  const scans = rows
    .map((r) => getScanByClientId(r.client_scan_id))
    .filter((s): s is Scan => s != null);
  
  console.error(scans)

  const payload = {
    scans: await Promise.all(
    scans.map((s) => buildSyncPayload(s))
  ),
  };

  console.error(payload);

  // Mark all as in-flight before the call.
  for (const r of rows) updateQueueStatus(r.client_scan_id, 'IN_FLIGHT');

  try {
    const res = await api<{
      results: Array<{
        client_scan_id: string;
        status: 'CREATED' | 'REJECTED' | 'DUPLICATE';
        server_scan_id: string | null;
        error: { error: string; message: string } | null;
      }>;
    }>('/sync/batch', { method: 'POST', body: payload });

    for (const r of res.results) {
      if (r.status === 'CREATED' && r.server_scan_id) {
        markScanUploaded(r.client_scan_id, r.server_scan_id, null);
        updateQueueStatus(r.client_scan_id, 'DONE');
        removeQueueRow(r.client_scan_id);
        summary.uploaded += 1;
      } else if (r.status === 'DUPLICATE') {
        updateQueueStatus(r.client_scan_id, 'DONE');
        removeQueueRow(r.client_scan_id);
        summary.uploaded += 1;
      } else {
        updateQueueStatus(r.client_scan_id, 'FAILED', r.error?.message ?? 'Rejected');
        summary.failed += 1;
        summary.errors.push({
          client_scan_id: r.client_scan_id,
          error: r.error?.message ?? 'Rejected',
        });
      }
    }
  } catch (err: any) {
    console.error(err)
    const message = err?.message ?? 'Network error';
    for (const r of rows) {
      updateQueueStatus(r.client_scan_id, 'FAILED', message);
      summary.errors.push({ client_scan_id: r.client_scan_id, error: message });
    }
    summary.failed = rows.length;
  }

  return summary;
}

export async function syncSingle(clientScanId: string): Promise<void> {
  const scan = getScanByClientId(clientScanId);
  if (!scan) throw new Error('Scan not found locally');
  updateQueueStatus(clientScanId, 'IN_FLIGHT');
  try {
    const body = await buildSyncPayload(scan);
    const res = await api<{ server_scan_id: string; network_id: string; accepted: boolean }>(
      '/sync',
      { method: 'POST', body },
    );
    markScanUploaded(clientScanId, res.server_scan_id, res.network_id);
    updateQueueStatus(clientScanId, 'DONE');
    removeQueueRow(clientScanId);
  } catch (err: any) {
    updateQueueStatus(clientScanId, 'FAILED', err?.message ?? 'Network error');
    throw err;
  }
}

async function buildSyncPayload(scan: Scan) {
  const attacks: Attack[] = getAttacksForScan(scan.id);

  const ordered = {
    client_scan_id: scan.client_scan_id,
    network: { ssid: scan.network, bssid: scan.network_id, channel: scan.channel, encryption_type: scan.en },
    safety_score: scan.safety_score,
    scan_duration_sec: scan.scan_duration_sec,
    scan_config: { modules: ['ALL'], duration: scan.scan_duration_sec ?? 60 },
    attacks,
    device_hardware_id: scan.device_hardware_id,
    firmware_version: scan.firmware_version,
    started_at: scan.started_at,
    completed_at: scan.completed_at,
  }

  const serialized = JSON.stringify(ordered);

  const payload_hash = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    serialized,
    { encoding: CryptoEncoding.HEX },
  );

  const payload = {
    ...ordered,
    payload_hash
  };

  return payload;
}
