import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AttackResponseDto {
  @ApiProperty({ example: 'DEAUTH_FLOOD' })
  @Expose()
  attack_type!: string;

  @ApiProperty({ example: 'HIGH' })
  @Expose()
  severity!: string;

  @ApiProperty({ example: 0.92 })
  @Expose()
  confidence!: number;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  detected_at!: Date;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  @Expose()
  details!: Record<string, any> | null;
}

export class ScanNetworkSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'HomeNetwork' })
  @Expose()
  ssid!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @Expose()
  bssid!: string;
}

export class ScanListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  server_scan_id!: string;

  @ApiProperty({ example: 'client-uuid-1234' })
  @Expose()
  client_scan_id!: string;

  @ApiProperty({ type: () => ScanNetworkSummaryDto })
  @Expose()
  network!: ScanNetworkSummaryDto;

  @ApiProperty({ example: 78 })
  @Expose()
  safety_score!: number;

  @ApiProperty({ example: 12 })
  @Expose()
  scan_duration_sec!: number;

  @ApiProperty({ type: () => [AttackResponseDto] })
  @Expose()
  attacks!: AttackResponseDto[];

  @ApiProperty({ example: 'ESP32-ABCDEF' })
  @Expose()
  device_hardware_id!: string;

  @ApiProperty({ example: '1.2.3' })
  @Expose()
  firmware_version!: string;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  started_at!: string;

  @ApiProperty({ example: '2024-06-01T12:00:12.000Z' })
  @Expose()
  completed_at!: string;
}

export class ScanListResponseDto {
  @ApiProperty({ type: () => [ScanListItemDto] })
  @Expose()
  scans!: ScanListItemDto[];

  @ApiProperty({ example: 100 })
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

export class ScanHistoryAttackDto {
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

export class ScanHistoryEntryDto {
  @ApiProperty({ example: '2024-06-01' })
  @Expose()
  date!: string;

  @ApiProperty({ example: 78 })
  @Expose()
  safety_score!: number;

  @ApiProperty({ type: () => [ScanHistoryAttackDto] })
  @Expose()
  attacks!: ScanHistoryAttackDto[];
}

export class ScanDetailNetworkDto {
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

  @ApiProperty({ example: 75.5, nullable: true })
  @Expose()
  avg_safety_score!: number | null;

  @ApiProperty({ example: 42, nullable: true })
  @Expose()
  min_safety_score!: number | null;

  @ApiProperty({ example: 99, nullable: true })
  @Expose()
  max_safety_score!: number | null;

  @ApiProperty({ example: 10, nullable: true })
  @Expose()
  total_scans!: number | null;

  @ApiProperty({ example: 3, nullable: true })
  @Expose()
  total_users_scanned!: number | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  @Expose()
  attack_summary!: Record<string, { count: number; avg_confidence: number }> | null;

  @ApiProperty({ type: () => [ScanHistoryEntryDto], nullable: true })
  @Expose()
  scan_history!: ScanHistoryEntryDto[] | null;
}

export class ScanDetailResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  server_scan_id!: string;

  @ApiProperty({ example: 'client-uuid-1234' })
  @Expose()
  client_scan_id!: string;

  @ApiProperty({ type: () => ScanDetailNetworkDto })
  @Expose()
  network!: ScanDetailNetworkDto;

  @ApiProperty({ example: 78 })
  @Expose()
  safety_score!: number;

  @ApiProperty({ example: 12 })
  @Expose()
  scan_duration_sec!: number;

  @ApiProperty({ type: () => [AttackResponseDto] })
  @Expose()
  attacks!: AttackResponseDto[];

  @ApiProperty({ example: 'ESP32-ABCDEF' })
  @Expose()
  device_hardware_id!: string;

  @ApiProperty({ example: '1.2.3' })
  @Expose()
  firmware_version!: string;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  started_at!: string;

  @ApiProperty({ example: '2024-06-01T12:00:12.000Z' })
  @Expose()
  completed_at!: string;
}
