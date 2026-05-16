import { apiFetch } from './client';
import type { ScanSummary } from './types';

export type ListScansResponse = {
  scans: ScanSummary[];
  total: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page: number;
};

export function listScans(params: {
  cursor?: string;
  per_page?: number;
  network_id?: string;
  since?: string;
} = {}) {
  const q = new URLSearchParams();
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.per_page) q.set('per_page', String(params.per_page));
  if (params.network_id) q.set('network_id', params.network_id);
  if (params.since) q.set('since', params.since);
  const qs = q.toString();
  return apiFetch<ListScansResponse>(`/scans${qs ? `?${qs}` : ''}`);
}

export function getScan(id: string) {
  return apiFetch<ScanSummary & { network: any; safety_score: number }>(`/scans/${id}`);
}
