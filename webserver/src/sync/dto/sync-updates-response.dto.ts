import { Network } from '../../networks/entities/network.entity';

export interface SyncUpdatesResponseDto {
  updated_networks: Network[];
  global_stats: Record<string, unknown>;
  has_more: boolean;
  next_since: string;
  server_time: string;
}