import { IsOptional, IsString, IsNumber, IsInt, Min, Max, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryNetworksDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: 'bssid must be a valid MAC address (AA:BB:CC:DD:EE:FF)' })
  bssid?: string;

  @IsOptional()
  @IsString()
  @IsIn(['safety_score', 'total_scans', 'last_scanned_at', 'ssid'])
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_scans?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius_km?: number;
}
