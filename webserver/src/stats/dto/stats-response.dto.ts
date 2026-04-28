import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ScansPerDayDto {
  @ApiProperty({ example: '2024-06-01' })
  @Expose()
  date!: string;

  @ApiProperty({ example: 12 })
  @Expose()
  count!: number;
}

export class TopDangerousNetworkDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'FreeWifi' })
  @Expose()
  ssid!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @Expose()
  bssid!: string;

  @ApiProperty({ example: 25.3, nullable: true })
  @Expose()
  avg_safety_score!: number | null;

  @ApiProperty({ example: 8 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: ['EVIL_TWIN', 'DEAUTH_FLOOD'] })
  @Expose()
  top_attacks!: string[];
}

export class TopContributorDto {
  @ApiProperty({ example: 'Alice' })
  @Expose()
  display_name!: string;

  @ApiProperty({ example: 42 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: 15 })
  @Expose()
  total_networks!: number;
}

export class GlobalStatsResponseDto {
  @ApiProperty({ example: 1024 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: 256 })
  @Expose()
  total_networks!: number;

  @ApiProperty({ example: 48 })
  @Expose()
  total_users!: number;

  @ApiProperty({ example: 72.4, nullable: true })
  @Expose()
  avg_safety_score!: number | null;

  @ApiProperty({ type: Object, additionalProperties: true })
  @Expose()
  attack_distribution!: Record<string, number>;

  @ApiProperty({ type: () => [ScansPerDayDto] })
  @Expose()
  scans_per_day!: ScansPerDayDto[];

  @ApiProperty({ type: () => [TopDangerousNetworkDto] })
  @Expose()
  top_dangerous_networks!: TopDangerousNetworkDto[];

  @ApiProperty({ type: () => [TopContributorDto] })
  @Expose()
  top_contributors!: TopContributorDto[];
}

export class AttackTrendEntryDto {
  @ApiProperty({ example: '2024-W22' })
  @Expose()
  week!: string;

  @ApiProperty({ example: 7 })
  @Expose()
  count!: number;
}

export class AttackStatsResponseDto {
  @ApiProperty({ example: 'DEAUTH_FLOOD' })
  @Expose()
  attack_type!: string;

  @ApiProperty({ example: 42 })
  @Expose()
  total_detections!: number;

  @ApiProperty({ example: 0.88, nullable: true })
  @Expose()
  avg_confidence!: number | null;

  @ApiProperty({ type: Object, additionalProperties: true })
  @Expose()
  severity_distribution!: Record<string, number>;

  @ApiProperty({ type: () => [AttackTrendEntryDto] })
  @Expose()
  trend!: AttackTrendEntryDto[];
}
