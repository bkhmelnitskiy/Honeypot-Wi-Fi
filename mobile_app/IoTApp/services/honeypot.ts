// Honeypot Communication Manager (BLE GATT).
//
// Implements the protocol from Dokumentacja/Architektura/API.md §2.
// The real transport is BLE GATT (Write/Notify on characteristics FFF1/FFF2/FFF3)
// — that requires a native module such as `react-native-ble-plx`, which is not
// part of the Expo Go runtime and must be added in a development build.
//
// To keep the rest of the app testable without a paired Raspberry Pi attached,
// this module ships with a MockHoneypotTransport that simulates the protocol.
// Swap `transport` with a real BLE-backed implementation once the native module
// is installed; the rest of the app keeps the same interface.

import type { Attack } from '@/constants/db';

export type HoneypotState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'PAIRING'
  | 'CONNECTED'
  | 'ERROR';

export type DiscoveredDevice = {
  id: string;
  name: string;
  rssi: number;
};

export type DeviceStatus = {
  status: 'OK' | 'ERROR';
  battery_pct: number;
  firmware: string;
  uptime_sec: number;
  wlan0_state: string;
  wlan1_state: string;
  active_scan: {
    scan_id: string;
    state: ScanState;
    progress_pct: number;
  } | null;
  pending_results: string[];
};

export type DeviceInfo = {
  device_id: string;
  firmware_version: string;
  hardware_model: string;
  wlan0_mac: string;
  wlan1_mac: string;
  battery_pct: number;
  storage_free_mb: number;
  total_scans_performed: number;
};

export type AvailableNetwork = {
  ssid: string;
  bssid: string;
  channel: number;
  signal_dbm: number;
  encryption: string;
  frequency_mhz: number;
};

export type ScanState =
  | 'INITIALIZING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SCANNING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'ERROR';

export type StatusUpdate = {
  scan_id: string;
  state: ScanState;
  progress_pct: number;
  current_module?: string;
  modules_completed?: string[];
  message?: string;
  elapsed_sec: number;
};

export type ScanResult = {
  client_scan_id: string;
  network: { ssid: string; bssid: string; channel: number; encryption_type: string; frequency_mhz: number };
  safety_score: number;
  scan_duration_sec: number;
  attacks: Attack[];
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
};

export type StartScanRequest = {
  ssid: string;
  bssid: string;
  password?: string | null;
  duration_sec?: number;
  modules?: string[];
};

export interface HoneypotTransport {
  state(): HoneypotState;
  onStateChange(listener: (s: HoneypotState) => void): () => void;

  discover(): Promise<DiscoveredDevice[]>;
  pair(deviceId: string, code: string): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;

  ping(): Promise<DeviceStatus>;
  getDeviceInfo(): Promise<DeviceInfo>;
  listNetworks(scan_duration_sec?: number): Promise<AvailableNetwork[]>;

  startScan(req: StartScanRequest): Promise<{ scan_id: string; estimated_duration_sec: number }>;
  stopScan(scan_id: string): Promise<void>;
  getResult(scan_id: string): Promise<ScanResult>;

  onStatusUpdate(listener: (u: StatusUpdate) => void): () => void;
}

// -------- Mock transport --------

const MOCK_NETWORKS: AvailableNetwork[] = [
  { ssid: 'FreeWiFi',    bssid: 'AA:BB:CC:DD:EE:01', channel: 6,  signal_dbm: -52, encryption: 'OPEN',     frequency_mhz: 2437 },
  { ssid: 'CoffeeHouse', bssid: 'AA:BB:CC:DD:EE:02', channel: 11, signal_dbm: -64, encryption: 'WPA2-PSK', frequency_mhz: 2462 },
  { ssid: 'Airport_Free',bssid: 'AA:BB:CC:DD:EE:03', channel: 1,  signal_dbm: -71, encryption: 'OPEN',     frequency_mhz: 2412 },
  { ssid: 'guest',       bssid: 'AA:BB:CC:DD:EE:04', channel: 36, signal_dbm: -58, encryption: 'WPA2-PSK', frequency_mhz: 5180 },
];

class MockHoneypotTransport implements HoneypotTransport {
  private _state: HoneypotState = 'DISCONNECTED';
  private stateListeners = new Set<(s: HoneypotState) => void>();
  private statusListeners = new Set<(u: StatusUpdate) => void>();
  private activeScanTimer: ReturnType<typeof setInterval> | null = null;
  private activeScan: { scan_id: string; req: StartScanRequest; startedAt: number; durationSec: number } | null = null;
  private completedResults: ScanResult[] = [];

  state() {
    return this._state;
  }

  onStateChange(listener: (s: HoneypotState) => void) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(next: HoneypotState) {
    this._state = next;
    this.stateListeners.forEach((l) => l(next));
  }

  async discover() {
    await delay(400);
    return [
      { id: 'rpi-honeypot-01', name: 'Honeypot RPi #01', rssi: -54 },
      { id: 'rpi-honeypot-02', name: 'Honeypot RPi #02', rssi: -71 },
    ];
  }

  async pair(_deviceId: string, code: string) {
    this.setState('PAIRING');
    await delay(600);
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this.setState('ERROR');
      throw new Error('Invalid pairing code');
    }
    this.setState('CONNECTED');
  }

  async connect(_deviceId: string) {
    this.setState('CONNECTING');
    await delay(500);
    this.setState('CONNECTED');
  }

  async disconnect() {
    this.setState('DISCONNECTED');
  }

  async ping(): Promise<DeviceStatus> {
    return {
      status: 'OK',
      battery_pct: 78,
      firmware: '1.2.0',
      uptime_sec: 3600,
      wlan0_state: this.activeScan ? 'CONNECTED' : 'IDLE',
      wlan1_state: this.activeScan ? 'MONITOR' : 'IDLE',
      active_scan: this.activeScan
        ? {
            scan_id: this.activeScan.scan_id,
            state: 'SCANNING',
            progress_pct: this.computeProgressPct(),
          }
        : null,
      pending_results: this.completedResults.map((r) => r.client_scan_id),
    };
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      device_id: 'rpi-serial-mock',
      firmware_version: '1.2.0',
      hardware_model: 'RPi 4 (mock)',
      wlan0_mac: 'AA:BB:CC:00:11:22',
      wlan1_mac: 'AA:BB:CC:00:11:33',
      battery_pct: 78,
      storage_free_mb: 2137,
      total_scans_performed: 46,
    };
  }

  async listNetworks(scan_duration_sec = 5): Promise<AvailableNetwork[]> {
    await delay(Math.min(scan_duration_sec, 3) * 300);
    return MOCK_NETWORKS;
  }

  async startScan(req: StartScanRequest) {
    if (this.activeScan) {
      throw new Error('BUSY');
    }
    const scan_id = `scan-${Date.now()}`;
    const durationSec = req.duration_sec ?? 60;
    this.activeScan = { scan_id, req, startedAt: Date.now(), durationSec };

    // Emit periodic STATUS_UPDATEs.
    const tick = () => {
      if (!this.activeScan) return;
      const pct = this.computeProgressPct();
      const elapsed = Math.floor((Date.now() - this.activeScan.startedAt) / 1000);
      const state: ScanState =
        pct < 5 ? 'INITIALIZING' :
        pct < 15 ? 'CONNECTING' :
        pct < 90 ? 'SCANNING' :
        pct < 100 ? 'ANALYZING' :
        'COMPLETED';
      const update: StatusUpdate = {
        scan_id: this.activeScan.scan_id,
        state,
        progress_pct: pct,
        current_module: pct < 50 ? 'ARP_SPOOFING' : 'EVIL_TWIN',
        elapsed_sec: elapsed,
      };
      this.statusListeners.forEach((l) => l(update));
      if (pct >= 100) {
        this.finishScan();
      }
    };
    this.activeScanTimer = setInterval(tick, 500);

    return { scan_id, estimated_duration_sec: durationSec };
  }

  async stopScan(scan_id: string) {
    if (!this.activeScan || this.activeScan.scan_id !== scan_id) {
      throw new Error('SCAN_NOT_FOUND');
    }
    this.finishScan();
  }

  async getResult(scan_id: string): Promise<ScanResult> {
    const idx = this.completedResults.findIndex((r) => r.client_scan_id === scan_id);
    if (idx === -1) throw new Error('SCAN_NOT_FOUND');
    const [result] = this.completedResults.splice(idx, 1);
    return result;
  }

  onStatusUpdate(listener: (u: StatusUpdate) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // -------- internals --------

  private computeProgressPct() {
    if (!this.activeScan) return 0;
    const elapsedMs = Date.now() - this.activeScan.startedAt;
    return Math.min(100, Math.round((elapsedMs / (this.activeScan.durationSec * 1000)) * 100));
  }

  private finishScan() {
    if (!this.activeScan) return;
    const { scan_id, req, startedAt, durationSec } = this.activeScan;
    if (this.activeScanTimer) clearInterval(this.activeScanTimer);
    this.activeScanTimer = null;

    const completedAt = new Date().toISOString();
    const startedIso = new Date(startedAt).toISOString();

    const attacks: Attack[] = synthesizeAttacks(req.ssid);
    const score = computeSafetyScore(attacks);

    const result: ScanResult = {
      client_scan_id: scan_id,
      network: {
        ssid: req.ssid,
        bssid: req.bssid,
        channel: MOCK_NETWORKS.find((n) => n.bssid === req.bssid)?.channel ?? 6,
        encryption_type: MOCK_NETWORKS.find((n) => n.bssid === req.bssid)?.encryption ?? 'OPEN',
        frequency_mhz: MOCK_NETWORKS.find((n) => n.bssid === req.bssid)?.frequency_mhz ?? 2437,
      },
      safety_score: score,
      scan_duration_sec: durationSec,
      attacks,
      device_hardware_id: 'rpi-serial-mock',
      firmware_version: '1.2.0',
      started_at: startedIso,
      completed_at: completedAt,
    };
    this.completedResults.push(result);
    this.activeScan = null;

    // Emit a final COMPLETED status.
    this.statusListeners.forEach((l) =>
      l({
        scan_id,
        state: 'COMPLETED',
        progress_pct: 100,
        elapsed_sec: durationSec,
        message: 'Scan complete',
      }),
    );
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function synthesizeAttacks(ssid: string): Attack[] {
  // Deterministic-ish per-ssid demo data so the UI shows realistic results.
  const seed = ssid.toLowerCase();
  const open = seed.includes('free') || seed.includes('airport') || seed.includes('guest');
  const now = new Date().toISOString();
  if (!open) return [];
  const attacks: Attack[] = [
    {
      attack_type: 'ARP_SPOOFING',
      severity: 'HIGH',
      confidence: 0.87,
      detected_at: now,
      details: { attacker_mac: 'DE:AD:BE:EF:00:01', target_ip: '192.168.1.1' },
    },
  ];
  if (seed.includes('airport') || seed.includes('free')) {
    attacks.push({
      attack_type: 'EVIL_TWIN',
      severity: 'CRITICAL',
      confidence: 0.65,
      detected_at: now,
      details: { spoofed_bssid: 'DE:AD:BE:EF:00:02' },
    });
  }
  return attacks;
}

export function computeSafetyScore(attacks: Attack[]): number {
  let score = 100;
  for (const a of attacks) {
    const base = a.severity === 'CRITICAL' ? 30 : a.severity === 'HIGH' ? 20 : a.severity === 'MEDIUM' ? 10 : 5;
    score -= base * a.confidence;
  }
  return Math.max(0, Math.round(score * 10) / 10);
}

// Singleton transport. Replace with a real BLE-backed transport when available.
export const honeypot: HoneypotTransport = new MockHoneypotTransport();
