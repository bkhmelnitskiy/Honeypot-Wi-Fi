import { IsOptional, IsString, IsNumber, IsInt, Min, Max, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryNetworksDto extends PaginationQueryDto {
  @ApiProperty({ required: false, example: 'HomeNetwork' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, example: 'AA:BB:CC:DD:EE:FF' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: 'bssid must be a valid MAC address (AA:BB:CC:DD:EE:FF)' })
  bssid?: string;

  @ApiProperty({ required: false, enum: ['safety_score', 'total_scans', 'last_scanned_at', 'ssid'] })
  @IsOptional()
  @IsString()
  @IsIn(['safety_score', 'total_scans', 'last_scanned_at', 'ssid'])
  sort?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiProperty({ required: false, minimum: 1, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_scans?: number;

  @ApiProperty({ required: false, example: 52.2297, description: 'Latitude for GPS proximity filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false, example: 21.0122, description: 'Longitude for GPS proximity filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({ required: false, minimum: 0.1, maximum: 50, example: 5, description: 'Search radius in km' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius_km?: number;
}
