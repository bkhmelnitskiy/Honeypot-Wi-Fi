import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('myapp.db');

// TODO zmienić ten typ
export type Scan = {
  id: number;
  server_scan_id: string | null;
  client_scan_id: string;
  network: string;
  network_id: string | null;
  channel: number | null;
  safety_score: number | null;
  scan_duration_sec: number | null;
  attacks: string;
  device_hardware_id: string | null;
  firmware_version: string | null;
  started_at: string | null;
  completed_at: string | null;
  payload_hash: string | null;
};

export type Attack = {
  attack_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  detected_at: string;
  details?: Record<string, unknown>;
};

export type CachedNetwork = {
  id: string;
  ssid: string;
  bssid: string | null;
  avg_safety_score: number | null;
  total_scans: number;
  last_scanned_at: string | null;
  last_safety_score: number | null;
  top_attacks: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  updated_at: string;
};

export type UploadQueueRow = {
  id: number;
  client_scan_id: string;
  status: 'PENDING' | 'IN_FLIGHT' | 'FAILED' | 'DONE';
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
  updated_at: string;
};

export type SessionRow = {
  key: string;
  value: string;
};

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_scan_id TEXT,
      client_scan_id TEXT NOT NULL UNIQUE,
      network TEXT NOT NULL,
      network_id TEXT,
      channel INTEGER,
      safety_score REAL,
      scan_duration_sec INTEGER,
      attacks TEXT NOT NULL DEFAULT '[]',
      device_hardware_id TEXT,
      firmware_version TEXT,
      started_at TEXT,
      completed_at TEXT,
      payload_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS attack_detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL,
      attack_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      confidence REAL NOT NULL,
      detected_at TEXT NOT NULL,
      details TEXT,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cached_networks (
      id TEXT PRIMARY KEY,
      ssid TEXT NOT NULL,
      bssid TEXT,
      avg_safety_score REAL,
      total_scans INTEGER NOT NULL DEFAULT 0,
      last_scanned_at TEXT,
      last_safety_score REAL,
      top_attacks TEXT NOT NULL DEFAULT '[]',
      gps_latitude REAL,
      gps_longitude REAL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_scan_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      enqueued_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_session (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scans_started_at ON scans(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scans_client_id ON scans(client_scan_id);
    CREATE INDEX IF NOT EXISTS idx_attacks_scan_id ON attack_detections(scan_id);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON upload_queue(status);
  `);
}

// ---------- Scans ----------

export function getItems(): Scan[] {
  return db.getAllSync<Scan>('SELECT * FROM scans ORDER BY datetime(started_at) DESC');
}

export function getItemById(id: number): Scan | null {
  return db.getFirstSync<Scan>('SELECT * FROM scans WHERE id = ?', [id]);
}

export function getScanByClientId(clientScanId: string): Scan | null {
  return db.getFirstSync<Scan>('SELECT * FROM scans WHERE client_scan_id = ?', [clientScanId]);
}

export type NewScan = {
  client_scan_id: string;
  network: string;
  network_id?: string | null;
  channel?: number | null;
  safety_score: number | null;
  scan_duration_sec: number | null;
  attacks: Attack[];
  device_hardware_id?: string | null;
  firmware_version?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  payload_hash?: string | null;
};

export function insertScan(scan: NewScan): number {
  const result = db.runSync(
    `INSERT INTO scans
      (client_scan_id, network, network_id, channel, safety_score, scan_duration_sec, attacks,
       device_hardware_id, firmware_version, started_at, completed_at, payload_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scan.client_scan_id,
      scan.network,
      scan.network_id ?? null,
      scan.channel ?? null,
      scan.safety_score,
      scan.scan_duration_sec,
      JSON.stringify(scan.attacks ?? []),
      scan.device_hardware_id ?? null,
      scan.firmware_version ?? null,
      scan.started_at ?? null,
      scan.completed_at ?? null,
      scan.payload_hash ?? null,
    ],
  );
  const scanId = Number(result.lastInsertRowId);
  for (const a of scan.attacks ?? []) {
    db.runSync(
      `INSERT INTO attack_detections (scan_id, attack_type, severity, confidence, detected_at, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        scanId,
        a.attack_type,
        a.severity,
        a.confidence,
        a.detected_at,
        a.details ? JSON.stringify(a.details) : null,
      ],
    );
  }
  return scanId;
}

export function markScanUploaded(clientScanId: string, serverScanId: string, networkId: string | null) {
  return db.runSync(
    'UPDATE scans SET server_scan_id = ?, network_id = COALESCE(?, network_id) WHERE client_scan_id = ?',
    [serverScanId, networkId, clientScanId],
  );
}

export function deleteItem(id: number) {
  return db.runSync('DELETE FROM scans WHERE id = ?', [id]);
}

export function getAttacksForScan(scanId: number): Attack[] {
  const rows = db.getAllSync<{
    attack_type: string;
    severity: Attack['severity'];
    confidence: number;
    detected_at: string;
    details: string | null;
  }>('SELECT attack_type, severity, confidence, detected_at, details FROM attack_detections WHERE scan_id = ?', [scanId]);
  return rows.map((r) => ({
    attack_type: r.attack_type,
    severity: r.severity,
    confidence: r.confidence,
    detected_at: r.detected_at,
    details: r.details ? JSON.parse(r.details) : undefined,
  }));
}

export function countScans(): number {
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM scans');
  return row?.c ?? 0;
}

export function avgSafetyScore(): number | null {
  const row = db.getFirstSync<{ avg: number | null }>(
    'SELECT AVG(safety_score) AS avg FROM scans WHERE safety_score IS NOT NULL',
  );
  return row?.avg ?? null;
}

// ---------- Upload queue ----------

export function enqueueUpload(clientScanId: string) {
  const now = new Date().toISOString();
  return db.runSync(
    `INSERT OR IGNORE INTO upload_queue (client_scan_id, status, attempts, enqueued_at, updated_at)
     VALUES (?, 'PENDING', 0, ?, ?)`,
    [clientScanId, now, now],
  );
}

export function getPendingUploads(limit = 50): UploadQueueRow[] {
  return db.getAllSync<UploadQueueRow>(
    `SELECT * FROM upload_queue
     WHERE status IN ('PENDING', 'FAILED')
     ORDER BY datetime(enqueued_at) ASC
     LIMIT ?`,
    [limit],
  );
}

export function getAllQueueRows(): UploadQueueRow[] {
  return db.getAllSync<UploadQueueRow>(
    'SELECT * FROM upload_queue ORDER BY datetime(enqueued_at) DESC',
  );
}

export function updateQueueStatus(
  clientScanId: string,
  status: UploadQueueRow['status'],
  error: string | null = null,
) {
  const now = new Date().toISOString();
  return db.runSync(
    `UPDATE upload_queue
     SET status = ?, last_error = ?, attempts = attempts + CASE WHEN ? = 'FAILED' THEN 1 ELSE 0 END,
         updated_at = ?
     WHERE client_scan_id = ?`,
    [status, error, status, now, clientScanId],
  );
}

export function removeQueueRow(clientScanId: string) {
  return db.runSync('DELETE FROM upload_queue WHERE client_scan_id = ?', [clientScanId]);
}

export function countQueue(status?: UploadQueueRow['status']): number {
  if (status) {
    const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM upload_queue WHERE status = ?', [status]);
    return row?.c ?? 0;
  }
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM upload_queue');
  return row?.c ?? 0;
}

// ---------- Session storage (token / user) ----------
// NOTE: In production these values should live in expo-secure-store / Android Keystore.
// Until that dep is added this acts as a single source of truth.

export function sessionSet(key: string, value: string) {
  return db.runSync(
    'INSERT INTO user_session (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export function sessionGet(key: string): string | null {
  const row = db.getFirstSync<SessionRow>('SELECT * FROM user_session WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function sessionDelete(key: string) {
  return db.runSync('DELETE FROM user_session WHERE key = ?', [key]);
}

export function sessionClear() {
  return db.runSync('DELETE FROM user_session');
}

// ---------- Cached networks ----------

export function upsertCachedNetwork(n: CachedNetwork) {
  return db.runSync(
    `INSERT INTO cached_networks
      (id, ssid, bssid, avg_safety_score, total_scans, last_scanned_at,
       last_safety_score, top_attacks, gps_latitude, gps_longitude, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       ssid = excluded.ssid,
       bssid = excluded.bssid,
       avg_safety_score = excluded.avg_safety_score,
       total_scans = excluded.total_scans,
       last_scanned_at = excluded.last_scanned_at,
       last_safety_score = excluded.last_safety_score,
       top_attacks = excluded.top_attacks,
       gps_latitude = excluded.gps_latitude,
       gps_longitude = excluded.gps_longitude,
       updated_at = excluded.updated_at`,
    [
      n.id,
      n.ssid,
      n.bssid,
      n.avg_safety_score,
      n.total_scans,
      n.last_scanned_at,
      n.last_safety_score,
      n.top_attacks,
      n.gps_latitude,
      n.gps_longitude,
      n.updated_at,
    ],
  );
}

export function getCachedNetworks(search?: string, limit = 50): CachedNetwork[] {
  if (search) {
    return db.getAllSync<CachedNetwork>(
      `SELECT * FROM cached_networks WHERE ssid LIKE ? ORDER BY datetime(last_scanned_at) DESC LIMIT ?`,
      [`%${search}%`, limit],
    );
  }
  return db.getAllSync<CachedNetwork>(
    'SELECT * FROM cached_networks ORDER BY datetime(last_scanned_at) DESC LIMIT ?',
    [limit],
  );
}

// ---------- Community cache ----------

export function cachePut(key: string, payload: unknown) {
  return db.runSync(
    `INSERT INTO community_cache (key, payload, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    [key, JSON.stringify(payload), new Date().toISOString()],
  );
}

export function cacheGet<T = unknown>(key: string, maxAgeMs = 5 * 60 * 1000): T | null {
  const row = db.getFirstSync<{ payload: string; fetched_at: string }>(
    'SELECT payload, fetched_at FROM community_cache WHERE key = ?',
    [key],
  );
  if (!row) return null;
  const age = Date.now() - new Date(row.fetched_at).getTime();
  if (age > maxAgeMs) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

// ---------- Back-compat shim ----------

export function addItem(name: string) {
  return insertScan({
    client_scan_id: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    network: name,
    safety_score: null,
    scan_duration_sec: null,
    attacks: [],
    started_at: new Date().toISOString(),
  });
}

// Initialise schema eagerly on module import so callers don't need to
// remember to call initDB() before reading. SQLite operations are synchronous
// in expo-sqlite and the native module is available before the JS bundle runs.
initDB();

export default db;
