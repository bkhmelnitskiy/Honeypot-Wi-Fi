export interface GlobalStatsResponseDto {
  total_scans: number;
  total_networks: number;
  total_users: number;
  avg_safety_score: number | null;
  attack_distribution: Record<string, number>;
  scans_per_day: { date: string; count: number }[];
  top_dangerous_networks: {
    id: string;
    ssid: string;
    bssid: string;
    avg_safety_score: number | null;
    total_scans: number;
    top_attacks: string[];
  }[];
  top_contributors: {
    display_name: string;
    total_scans: number;
    total_networks: number;
  }[];
}

export interface AttackStatsResponseDto {
  attack_type: string;
  total_detections: number;
  avg_confidence: number | null;
  severity_distribution: Record<string, number>;
  trend: { week: string; count: number }[];
}
