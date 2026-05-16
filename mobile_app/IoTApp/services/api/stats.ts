import { apiFetch } from './client';
import type { AttackType, GlobalStats, Severity } from './types';

export function getGlobalStats() {
  return apiFetch<GlobalStats>('/stats/global');
}

export type AttackStatsResponse = {
  attack_type: AttackType;
  total_detections: number;
  avg_confidence: number;
  severity_distribution: Record<Severity, number>;
  trend: { week: string; count: number }[];
};

export function getAttackStats(params: { type?: AttackType; since?: string; network_id?: string } = {}) {
  const q = new URLSearchParams();
  if (params.type) q.set('type', params.type);
  if (params.since) q.set('since', params.since);
  if (params.network_id) q.set('network_id', params.network_id);
  const qs = q.toString();
  return apiFetch<AttackStatsResponse>(`/stats/attacks${qs ? `?${qs}` : ''}`);
}
