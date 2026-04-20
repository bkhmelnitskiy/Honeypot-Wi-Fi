import { IsDateString, IsInt, Min } from 'class-validator';

export class SyncStatusResponseDto {
  @IsInt()
  @Min(0)
  updated_count!: number;

  @IsDateString()
  server_time!: string;
}