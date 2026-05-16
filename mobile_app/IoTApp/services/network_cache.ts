import {
  cacheGet,
  cachePut,
  getCachedNetworks,
  upsertCachedNetwork,
  type CachedNetwork,
} from '@/constants/db';
import { api } from './api';

export type NetworkSummary = {
  id: string;
  ssid: string;
  bssid: string;
  avg_safety_score: number;
  total_scans: number;
  last_scanned_at: string;
  last_safety_score: number;
  top_attacks: string[];
  gps_latitude?: number | null;
  gps_longitude?: number | null;
};

export type NetworkDetail = NetworkSummary & {
  channel: number;
  encryption_type: string;
  min_safety_score: number;
  max_safety_score: number;
  total_users_scanned: number;
  attack_summary: Record<string, { count: number; avg_confidence: number }>;
  scan_history: { date: string; safety_score: number; attacks: string[] }[];
};

export type GlobalStats = {
  total_scans: number;
  total_networks: number;
  total_users: number;
  avg_safety_score: number;
  attack_distribution: Record<string, number>;
  scans_per_day: { date: string; count: number }[];
  top_dangerous_networks: NetworkSummary[];
  top_contributors: { display_name: string; total_scans: number; total_networks: number }[];
};

const CACHE_KEYS = {
  globalStats: 'community.global_stats',
  topDangerous: 'community.top_dangerous',
};

export async function searchNetworks(query?: string): Promise<NetworkSummary[]> {
  // Offline-first: read from cache, refresh in background if online succeeds.
  const cached = getCachedNetworks(query, 50);
  try {
    const res = await api<{ networks: NetworkSummary[] }>('/networks', {
      query: { search: query, per_page: 50 },
    });
    for (const n of res.networks) {
      upsertCachedNetwork(toCacheRow(n));
    }
    return res.networks;
  } catch {
    return cached.map(fromCacheRow);
  }
}

export async function getNetworkDetail(id: string): Promise<NetworkDetail> {
  return api<NetworkDetail>(`/networks/${id}`);
}

export async function getGlobalStats(forceRefresh = false): Promise<GlobalStats> {
  if (!forceRefresh) {
    const cached = cacheGet<GlobalStats>(CACHE_KEYS.globalStats);
    if (cached) return cached;
  }
  const res = await api<GlobalStats>('/stats/global', { auth: false });
  cachePut(CACHE_KEYS.globalStats, res);
  return res;
}

function toCacheRow(n: NetworkSummary): CachedNetwork {
  return {
    id: n.id,
    ssid: n.ssid,
    bssid: n.bssid,
    avg_safety_score: n.avg_safety_score,
    total_scans: n.total_scans,
    last_scanned_at: n.last_scanned_at,
    last_safety_score: n.last_safety_score,
    top_attacks: JSON.stringify(n.top_attacks ?? []),
    gps_latitude: n.gps_latitude ?? null,
    gps_longitude: n.gps_longitude ?? null,
    updated_at: new Date().toISOString(),
  };
}

function fromCacheRow(r: CachedNetwork): NetworkSummary {
  return {
    id: r.id,
    ssid: r.ssid,
    bssid: r.bssid ?? '',
    avg_safety_score: r.avg_safety_score ?? 0,
    total_scans: r.total_scans,
    last_scanned_at: r.last_scanned_at ?? '',
    last_safety_score: r.last_safety_score ?? 0,
    top_attacks: safeParseArray(r.top_attacks),
    gps_latitude: r.gps_latitude,
    gps_longitude: r.gps_longitude,
  };
}

function safeParseArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
