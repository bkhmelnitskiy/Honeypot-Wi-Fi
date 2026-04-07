export interface NetworkListItemDto {
  id: string;
  ssid: string;
  bssid: string;
  avg_safety_score: number | null;
  total_scans: number;
  last_scanned_at: string | null;
  last_safety_score: number | null;
  top_attacks: string[];
  gps_latitude: number | null;
  gps_longitude: number | null;
}

export interface NetworkListResponseDto {
  networks: NetworkListItemDto[];
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page: number;
}

export interface NetworkDetailResponseDto {
  id: string;
  ssid: string;
  bssid: string;
  channel: number | null;
  encryption_type: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  avg_safety_score: number | null;
  min_safety_score: number | null;
  max_safety_score: number | null;
  total_scans: number;
  total_users_scanned: number;
  attack_summary: Record<string, { count: number; avg_confidence: number }>;
  scan_history: { date: string; safety_score: number; attacks: { attack_type: string; severity: string; confidence: number }[] }[];
}
