import { IsOptional, IsEnum, IsUUID, IsISO8601 } from 'class-validator';
import { AttackType } from '../../scans/entities/attack.entity';

export class QueryAttacksDto {
  @IsOptional()
  @IsEnum(AttackType)
  type?: AttackType;

  @IsOptional()
  @IsISO8601()
  since?: string;

  @IsOptional()
  @IsUUID()
  network_id?: string;
}
