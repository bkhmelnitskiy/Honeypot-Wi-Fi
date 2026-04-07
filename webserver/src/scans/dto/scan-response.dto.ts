export interface AttackResponseDto {
  attack_type: string;
  severity: string;
  confidence: number;
  detected_at: Date;
  details: Record<string, any> | null;
}

export interface ScanListItemDto {
  server_scan_id: string;
  client_scan_id: string;
  network: {
    id: string;
    ssid: string;
    bssid: string;
  };
  safety_score: number;
  scan_duration_sec: number;
  attacks: AttackResponseDto[];
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
}

export interface ScanListResponseDto {
  scans: ScanListItemDto[];
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page: number;
}

export interface ScanDetailResponseDto {
  server_scan_id: string;
  client_scan_id: string;
  network: {
    id: string;
    ssid: string;
    bssid: string;
    channel: number | null;
    avg_safety_score: number | null;
    min_safety_score: number | null;
    max_safety_score: number | null;
    total_scans: number | null;
    total_users_scanned: number | null;
    attack_summary: Record<string, { count: number; avg_confidence: number }> | null;
    scan_history: { date: string; safety_score: number; attacks: { attack_type: string; severity: string; confidence: number }[] }[] | null;
  };
  safety_score: number;
  scan_duration_sec: number;
  attacks: AttackResponseDto[];
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
}
