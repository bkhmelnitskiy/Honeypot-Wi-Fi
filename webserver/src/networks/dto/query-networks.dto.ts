import { IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class QueryNetworksDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
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
