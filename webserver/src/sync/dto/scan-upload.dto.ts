import {
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AttackType, Severity } from '../../scans/entities/attack.entity';

export class NetworkDto {
  @ApiProperty({ example: 'HomeNetwork' })
  @IsString()
  ssid: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  bssid: string;

  @ApiProperty({ required: false, example: 6 })
  @IsOptional()
  @IsNumber()
  channel?: number;

  @ApiProperty({ required: false, example: 'WPA2' })
  @IsOptional()
  @IsString()
  encryption_type?: string;

  @ApiProperty({ required: false, example: 2437 })
  @IsOptional()
  @IsNumber()
  frequency_mhz?: number;

  @ApiProperty({ required: false, example: 52.2297 })
  @IsOptional()
  @IsNumber()
  gps_latitude?: number;

  @ApiProperty({ required: false, example: 21.0122 })
  @IsOptional()
  @IsNumber()
  gps_longitude?: number;
}

export class AttackDto {
  @ApiProperty({ enum: AttackType })
  @IsEnum(AttackType)
  attack_type: AttackType;

  @ApiProperty({ enum: Severity })
  @IsEnum(Severity)
  severity: Severity;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.92 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @IsDateString()
  detected_at: string;

  @ApiProperty({ required: false, type: Object, additionalProperties: true })
  @IsOptional()
  details?: Record<string, any>;
}

export class ScanUploadDto {
  @ApiProperty({ format: 'uuid', example: 'client-uuid-1234' })
  @IsUUID()
  client_scan_id: string;

  @ApiProperty({ type: () => NetworkDto })
  @ValidateNested()
  @Type(() => NetworkDto)
  network: NetworkDto;

  @ApiProperty({ minimum: 0, maximum: 100, example: 78 })
  @IsNumber()
  @Min(0)
  @Max(100)
  safety_score: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  scan_duration_sec: number;

  @ApiProperty({ required: false, type: Object, additionalProperties: true })
  @IsOptional()
  scan_config?: Record<string, any>;

  @ApiProperty({ type: () => [AttackDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackDto)
  attacks: AttackDto[];

  @ApiProperty({ example: 'ESP32-ABCDEF' })
  @IsString()
  device_hardware_id: string;

  @ApiProperty({ example: '1.2.3' })
  @IsString()
  firmware_version: string;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @IsDateString()
  started_at: string;

  @ApiProperty({ example: '2024-06-01T12:00:12.000Z' })
  @IsDateString()
  completed_at: string;

  @ApiProperty({ required: false, example: 'sha256-abc123' })
  @IsOptional()
  @IsString()
  payload_hash?: string;
}
