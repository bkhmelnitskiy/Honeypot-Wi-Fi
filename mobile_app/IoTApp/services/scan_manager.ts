import { enqueueUpload, insertScan, type Attack } from '@/constants/db';
import { honeypot, type ScanResult, type StartScanRequest, type StatusUpdate } from './honeypot';

export type ScanProgress = {
  scan_id: string;
  state: StatusUpdate['state'];
  progress_pct: number;
  elapsed_sec: number;
  message?: string;
};

export type RunScanCallbacks = {
  onProgress?: (p: ScanProgress) => void;
};

// Coordinates a full scan lifecycle:
//   list networks → select → start → wait → get result → save → enqueue upload
export async function runScan(
  req: StartScanRequest,
  callbacks: RunScanCallbacks = {},
): Promise<{ localScanId: number; result: ScanResult }> {
  const { scan_id } = await honeypot.startScan(req);

  const result = await new Promise<ScanResult>((resolve, reject) => {
    const unsubscribe = honeypot.onStatusUpdate(async (u) => {
      if (u.scan_id !== scan_id) return;
      callbacks.onProgress?.({
        scan_id: u.scan_id,
        state: u.state,
        progress_pct: u.progress_pct,
        elapsed_sec: u.elapsed_sec,
        message: u.message,
      });
      if (u.state === 'COMPLETED') {
        unsubscribe();
        try {
          const r = await honeypot.getResult(scan_id);
          resolve(r);
        } catch (err) {
          reject(err);
        }
      } else if (u.state === 'ERROR') {
        unsubscribe();
        reject(new Error(u.message ?? 'Scan failed'));
      }
    });
  });

  const localScanId = persistScan(result);
  enqueueUpload(result.client_scan_id);

  return { localScanId, result };
}

export function persistScan(result: ScanResult): number {
  const id = insertScan({
    client_scan_id: result.client_scan_id,
    network: result.network.ssid,
    safety_score: result.safety_score,
    scan_duration_sec: result.scan_duration_sec,
    attacks: result.attacks as Attack[],
    device_hardware_id: result.device_hardware_id,
    firmware_version: result.firmware_version,
    started_at: result.started_at,
    completed_at: result.completed_at,
    payload_hash: null,
  });
  return id;
}

export async function cancelScan(scan_id: string) {
  await honeypot.stopScan(scan_id);
}
