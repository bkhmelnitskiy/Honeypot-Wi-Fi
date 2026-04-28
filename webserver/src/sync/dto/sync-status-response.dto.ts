import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class SyncStatusResponseDto {
  @ApiProperty({ example: 3 })
  @Expose()
  @IsInt()
  @Min(0)
  updated_count!: number;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  @IsDateString()
  server_time!: string;
}
