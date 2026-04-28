import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NetworkSyncDto {
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
  channel!: number;

  @ApiProperty({ example: 'WPA2' })
  @Expose()
  encryption_type!: string;

  @ApiProperty({ example: 2437, nullable: true })
  @Expose()
  frequency_mhz!: number;

  @ApiProperty({ example: 52.2297, nullable: true })
  @Expose()
  gps_latitude!: number;

  @ApiProperty({ example: 21.0122, nullable: true })
  @Expose()
  gps_longitude!: number;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  created_at!: Date;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  updated_at!: Date;
}

export class SyncUpdatesResponseDto {
  @ApiProperty({ type: () => [NetworkSyncDto] })
  @Expose()
  updated_networks!: NetworkSyncDto[];

  @ApiProperty({ type: Object, additionalProperties: true })
  @Expose()
  global_stats!: Record<string, unknown>;

  @ApiProperty({ example: false })
  @Expose()
  has_more!: boolean;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  next_since!: string;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  server_time!: string;
}
