import { apiFetch } from './client';
import type { CommunityNetwork } from './types';

export type ListNetworksParams = {
  search?: string;
  bssid?: string;
  sort?: 'safety_score' | 'total_scans' | 'last_scanned_at' | 'ssid';
  order?: 'asc' | 'desc';
  cursor?: string;
  per_page?: number;
  min_scans?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
};

export type ListNetworksResponse = {
  networks: CommunityNetwork[];
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
};

export function listNetworks(params: ListNetworksParams = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiFetch<ListNetworksResponse>(`/networks${qs ? `?${qs}` : ''}`);
}

export type NetworkDetails = CommunityNetwork & {
  channel?: number;
  encryption_type?: string;
  min_safety_score: number;
  max_safety_score: number;
  total_users_scanned: number;
  attack_summary: Record<string, { count: number; avg_confidence: number }>;
  scan_history: { date: string; safety_score: number; attacks: any[] }[];
};

export function getNetwork(id: string) {
  return apiFetch<NetworkDetails>(`/networks/${id}`);
}
