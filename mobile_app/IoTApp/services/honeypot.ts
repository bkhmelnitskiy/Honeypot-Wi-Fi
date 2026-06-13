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
import { getScanPrefs, type ScanPrefs } from '@/services/preferences';

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
  // signal_dbm: number; // TODO do wywalenia
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
  channel: number;
  encryption_type: string,
  password?: string | null;
  duration_sec?: number;
  modules?: string[];
  frequency_mhz: number;
};

export interface HoneypotTransport {
  state(): HoneypotState;
  onStateChange(listener: (s: HoneypotState) => void): () => void;

  discover(): Promise<DiscoveredDevice[]>;
  pair(deviceId: string, code: string): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;

  ping(): Promise<DeviceStatus | null>;
  getDeviceInfo(): Promise<DeviceInfo | null>;
  listNetworks(): Promise<AvailableNetwork[] | null>;

  startScan(req: StartScanRequest): Promise<{ scan_id: string; estimated_duration_sec: number }>;
  stopScan(scan_id: string): Promise<void>;
  getResult(scan_id: string): Promise<ScanResult>;

  onStatusUpdate(listener: (u: StatusUpdate) => void): () => void;
}

const statusToPct: Record<ScanState, number> = {
  'INITIALIZING': 0,
  'CONNECTING': 10,
  'CONNECTED': 30,
  'SCANNING': 60,
  'ANALYZING': 80,
  'COMPLETED': 100,
  'ERROR': -100,
};

// -------- Mock transport --------

const MOCK_NETWORKS: AvailableNetwork[] = [
  { ssid: 'FreeWiFi', bssid: 'AA:BB:CC:DD:EE:01', channel: 6, encryption: 'OPEN', frequency_mhz: 2437 },
  { ssid: 'CoffeeHouse', bssid: 'AA:BB:CC:DD:EE:02', channel: 11, encryption: 'WPA2-PSK', frequency_mhz: 2462 },
  { ssid: 'Airport_Free', bssid: 'AA:BB:CC:DD:EE:03', channel: 1, encryption: 'OPEN', frequency_mhz: 2412 },
  { ssid: 'guest', bssid: 'AA:BB:CC:DD:EE:04', channel: 36, encryption: 'WPA2-PSK', frequency_mhz: 5180 },
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

  async ping(): Promise<DeviceStatus | null> {
    try {
      const res = await fetch("http://192.168.200.1:5000/device_status");
      const data = await res.json();
      return data;
    } catch (err) {
      // console.error(err);
      return null;
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const res = await fetch("http://192.168.200.1:5000/device_info");
      const data = await res.json();
      return data;
    } catch (err) {
      // console.error(err);
      return null;
    }
  }

  async listNetworks(): Promise<AvailableNetwork[] | null> {
    try {
      const res = await fetch("http://192.168.200.1:5000/networks");
      const data = await res.json();

      return data.networks.map((network: any): AvailableNetwork => ({
        ssid: network.ssid,
        bssid: network.bssid,
        channel: Number(network.channel),
        encryption: network.security,
        frequency_mhz: Number(network.frequency_mhz),
      }));
    } catch (err) {
      // console.error(err);
      return null;
    }
  }

  async startScan(req: StartScanRequest) {
    const prefs: ScanPrefs = getScanPrefs();

    if (this.activeScan) {
      throw new Error('BUSY');
    }

    let scan_id: string;
    const durationSec = req.duration_sec ?? 60;

    try {
      const res = await fetch("http://192.168.200.1:5000/scan", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bssid: req.bssid,
          psk: req.password,
          duration: prefs.default_duration_sec
        })
      });
      const data = await res.json();
      scan_id = data.scan_id
      this.activeScan = { scan_id, req, startedAt: Date.now(), durationSec };
    } catch (err) {
      console.error(err);
      this.activeScan = null;
      return;
    }


    // Emit periodic STATUS_UPDATEs.
    const tick = async () => {
      if (!this.activeScan) return;

      try {
        const res = await fetch(`http://192.168.200.1:5000/scan/status?scan_id=${scan_id}`);
        const data = await res.json();

        const state: ScanState = data.scan.status;
        const pct = statusToPct[state] ?? 0;
        const elapsed = Math.floor((Date.now() - this.activeScan.startedAt) / 1000);
        const update: StatusUpdate = {
          scan_id: this.activeScan.scan_id,
          state,
          progress_pct: pct,
          current_module: pct < 50 ? 'ARP_SPOOFING' : 'EVIL_TWIN',
          elapsed_sec: elapsed,
        };

        if (pct >= 100) {
          await this.finishScan();
        }
        this.statusListeners.forEach((l) => l(update));
      } catch (err) {
        console.error(err);
        this.stopScan(this.activeScan.scan_id);
      }
    };

    this.activeScanTimer = setInterval(tick, 500);

    return { scan_id, estimated_duration_sec: durationSec };
  }

  async stopScan(scan_id: string) {
    if (!this.activeScan || this.activeScan.scan_id !== scan_id) {
      this.activeScan = null
      throw new Error('SCAN_NOT_FOUND');
    }
    await this.finishScan();
  }

  async getResult(scan_id: string): Promise<ScanResult> {
    const idx = this.completedResults.findIndex((r) => r.client_scan_id === scan_id);
    console.log("getResult() początek - completedResults", this.completedResults)
    if (idx === -1) {
      this.activeScan = null;
      throw new Error('SCAN_NOT_FOUND');
    }
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

  private async finishScan() {
    if (!this.activeScan) return;
    const { scan_id, req, startedAt, durationSec } = this.activeScan;
    if (this.activeScanTimer) clearInterval(this.activeScanTimer);
    this.activeScanTimer = null;

    const device_info = await this.getDeviceInfo();

    console.log("finishScan: Before fetch", this.activeScan)
    let data
    try {
      const res = await fetch(`http://192.168.200.1:5000/scan/status?scan_id=${scan_id}`);
      data = await res.json();
    } catch (err) {
      console.error(err);
      this.stopScan(this.activeScan.scan_id);
    }
    console.log("finishScan: After data fetch", this.activeScan)


    const state: ScanState = data.scan.status;

    const completedAt = new Date().toISOString();
    const startedIso = new Date(startedAt).toISOString();

    // const attacks: Attack[] = synthesizeAttacks(req.ssid);
    let attacks: Attack[] = [];
    try {
      const res = await fetch(`http://192.168.200.1:5000/alerts?scan_id=${scan_id}`);
      const alerts = await res.json();
      attacks = alerts["alerts"];
      console.error(attacks)
    } catch (err) {
      console.error(err);
      this.stopScan(this.activeScan.scan_id);
    }
    console.log("finishScan: After attacks fetch", this.activeScan)

    const score = computeSafetyScore(attacks);

    const result: ScanResult = {
      client_scan_id: scan_id,
      network: {
        ssid: req.ssid,
        bssid: req.bssid,
        channel: req.channel,
        encryption_type: req.encryption_type,
        frequency_mhz: req.frequency_mhz,
      },
      safety_score: score,
      scan_duration_sec: durationSec,
      attacks,
      device_hardware_id: device_info.hardware_model,
      firmware_version: device_info.firmware_version,
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
    console.log("finishScan: End", this.activeScan)
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
