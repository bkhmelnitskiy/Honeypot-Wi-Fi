import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NetworkListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'HomeNetwork' })
  @Expose()
  ssid!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @Expose()
  bssid!: string;

  @ApiProperty({ example: 75.5, nullable: true })
  @Expose()
  avg_safety_score!: number | null;

  @ApiProperty({ example: 10 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z', nullable: true })
  @Expose()
  last_scanned_at!: string | null;

  @ApiProperty({ example: 78, nullable: true })
  @Expose()
  last_safety_score!: number | null;

  @ApiProperty({ example: ['DEAUTH_FLOOD', 'EVIL_TWIN'] })
  @Expose()
  top_attacks!: string[];

  @ApiProperty({ example: 52.2297, nullable: true })
  @Expose()
  gps_latitude!: number | null;

  @ApiProperty({ example: 21.0122, nullable: true })
  @Expose()
  gps_longitude!: number | null;
}

export class NetworkListResponseDto {
  @ApiProperty({ type: () => [NetworkListItemDto] })
  @Expose()
  networks!: NetworkListItemDto[];

  @ApiProperty({ example: 50 })
  @Expose()
  total!: number;

  @ApiProperty({ example: 'eyJpZCI6IjEyMyJ9', nullable: true })
  @Expose()
  next_cursor!: string | null;

  @ApiProperty({ example: null, nullable: true })
  @Expose()
  prev_cursor!: string | null;

  @ApiProperty({ example: 20 })
  @Expose()
  per_page!: number;
}

export class NetworkScanHistoryAttackDto {
  @ApiProperty({ example: 'DEAUTH_FLOOD' })
  @Expose()
  attack_type!: string;

  @ApiProperty({ example: 'HIGH' })
  @Expose()
  severity!: string;

  @ApiProperty({ example: 0.92 })
  @Expose()
  confidence!: number;
}

export class NetworkScanHistoryEntryDto {
  @ApiProperty({ example: '2024-06-01' })
  @Expose()
  date!: string;

  @ApiProperty({ example: 78 })
  @Expose()
  safety_score!: number;

  @ApiProperty({ type: () => [NetworkScanHistoryAttackDto] })
  @Expose()
  attacks!: NetworkScanHistoryAttackDto[];
}

export class NetworkDetailResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'HomeNetwork' })
  @Expose()
  ssid!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @Expose()
  bssid!: string;

  @ApiProperty({ example: 6, nullable: true })
  @Expose()
  channel!: number | null;

  @ApiProperty({ example: 'WPA2' })
  @Expose()
  encryption_type!: string;

  @ApiProperty({ example: 52.2297, nullable: true })
  @Expose()
  gps_latitude!: number | null;

  @ApiProperty({ example: 21.0122, nullable: true })
  @Expose()
  gps_longitude!: number | null;

  @ApiProperty({ example: 75.5, nullable: true })
  @Expose()
  avg_safety_score!: number | null;

  @ApiProperty({ example: 42, nullable: true })
  @Expose()
  min_safety_score!: number | null;

  @ApiProperty({ example: 99, nullable: true })
  @Expose()
  max_safety_score!: number | null;

  @ApiProperty({ example: 10 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: 3 })
  @Expose()
  total_users_scanned!: number;

  @ApiProperty({ type: Object, additionalProperties: true })
  @Expose()
  attack_summary!: Record<string, { count: number; avg_confidence: number }>;

  @ApiProperty({ type: () => [NetworkScanHistoryEntryDto] })
  @Expose()
  scan_history!: NetworkScanHistoryEntryDto[];
}
