// Typy odpowiadające dokumentacji REST API (sekcja 1).

export type AttackType =
  | 'ARP_SPOOFING'
  | 'DNS_SPOOFING'
  | 'EVIL_TWIN'
  | 'DEAUTHENTICATION'
  | 'NETWORK_SCAN'
  | 'MALWARE_PROPAGATION';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Attack = {
  attack_type: AttackType;
  severity: Severity;
  confidence: number;
  detected_at: string;
  details: Record<string, unknown>;
};

export type ScanNetwork = {
  ssid: string;
  bssid: string;
  channel?: number;
  encryption_type?: string;
  frequency_mhz?: number;
  gps_latitude?: number;
  gps_longitude?: number;
};

export type ScanConfig = {
  modules: string[];
  duration: number;
};

export type ScanPayload = {
  client_scan_id: string;
  network: ScanNetwork;
  safety_score: number;
  scan_duration_sec: number;
  scan_config: ScanConfig;
  attacks: Attack[];
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
  payload_hash: string;
};

export type ScanSummary = {
  server_scan_id: string;
  client_scan_id: string;
  network: { id: string; ssid: string; bssid: string };
  safety_score: number;
  scan_duration_sec: number;
  attacks: Attack[];
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
};

export type LoginResponse = AuthTokens & {
  user_id: string;
  display_name: string;
};

export type UserProfile = {
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
  total_scans?: number;
  total_networks_scanned?: number;
};

export type CommunityNetwork = {
  id: string;
  ssid: string;
  bssid: string;
  avg_safety_score: number;
  total_scans: number;
  last_scanned_at: string | null;
  last_safety_score?: number;
  top_attacks?: AttackType[];
  gps_latitude?: number;
  gps_longitude?: number;
};

export type Paginated<T> = {
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page?: number;
} & ({ networks: T[] } | { scans: T[] });

export type SyncStatusResponse = {
  updated_count: number;
  server_time: string;
};

export type SyncSinceResponse = {
  updated_networks: CommunityNetwork[];
  global_stats: Record<string, unknown>;
  has_more: boolean;
  next_since: string;
  server_time: string;
};

export type BatchResultEntry = {
  client_scan_id: string;
  status: 'CREATED' | 'REJECTED';
  server_scan_id: string | null;
  error: { error: string; message: string } | null;
};

export type BatchResponse = {
  results: BatchResultEntry[];
};

export type GlobalStats = {
  total_scans: number;
  total_networks: number;
  total_users: number;
  avg_safety_score: number;
  attack_distribution: Record<AttackType, number>;
  scans_per_day: { date: string; count: number }[];
  top_dangerous_networks: CommunityNetwork[];
  top_contributors: { display_name: string; total_scans: number; total_networks: number }[];
};

export type ApiErrorBody = {
  error: string;
  message: string;
  details?: { field: string; reason: string }[];
};
