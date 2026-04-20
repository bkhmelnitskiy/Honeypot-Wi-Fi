import { IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncStatusQueryDto {
  @IsOptional()
  @IsDateString()
  since?: string;
}
