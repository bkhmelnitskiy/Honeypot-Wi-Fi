import { IsOptional, IsEnum, IsUUID, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttackType } from '../../scans/entities/attack.entity';

export class QueryAttacksDto {
  @ApiProperty({ required: false, enum: AttackType })
  @IsOptional()
  @IsEnum(AttackType)
  type?: AttackType;

  @ApiProperty({ required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsISO8601()
  since?: string;

  @ApiProperty({ required: false, format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  network_id?: string;
}
