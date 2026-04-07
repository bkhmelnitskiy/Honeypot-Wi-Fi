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
import { AttackType, Severity } from '../../scans/entities/attack.entity';

class NetworkDto {
  @IsString()
  ssid: string;

  @IsString()
  bssid: string;

  @IsOptional()
  @IsNumber()
  channel?: number;

  @IsOptional()
  @IsString()
  encryption_type?: string;

  @IsOptional()
  @IsNumber()
  frequency_mhz?: number;

  @IsOptional()
  @IsNumber()
  gps_latitude?: number;

  @IsOptional()
  @IsNumber()
  gps_longitude?: number;
}

class AttackDto {
  @IsEnum(AttackType)
  attack_type: AttackType;

  @IsEnum(Severity)
  severity: Severity;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsDateString()
  detected_at: string;

  @IsOptional()
  details?: Record<string, any>;
}

export class ScanUploadDto {
  @IsUUID()
  client_scan_id: string;

  @ValidateNested()
  @Type(() => NetworkDto)
  network: NetworkDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  safety_score: number;

  @IsNumber()
  scan_duration_sec: number;

  @IsOptional()
  scan_config?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackDto)
  attacks: AttackDto[];

  @IsString()
  device_hardware_id: string;

  @IsString()
  firmware_version: string;

  @IsDateString()
  started_at: string;

  @IsDateString()
  completed_at: string;

  @IsOptional()
  @IsString()
  payload_hash?: string;
}
