import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export type BatchResultStatus = 'CREATED' | 'REJECTED';

export class BatchResultErrorDto {
  @ApiProperty({ example: 'DUPLICATE' })
  @Expose()
  error!: string;

  @ApiProperty({ example: 'Scan with this client_scan_id already exists' })
  @Expose()
  message!: string;
}

export class BatchUploadResultDto {
  @ApiProperty({ example: 'client-uuid-1234' })
  @Expose()
  client_scan_id!: string;

  @ApiProperty({ enum: ['CREATED', 'REJECTED'], example: 'CREATED' })
  @Expose()
  status!: BatchResultStatus;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  @Expose()
  server_scan_id!: string | null;

  @ApiProperty({ type: () => BatchResultErrorDto, nullable: true })
  @Expose()
  error!: BatchResultErrorDto | null;
}

export class BatchUploadResponseDto {
  @ApiProperty({ type: () => [BatchUploadResultDto] })
  @Expose()
  results!: BatchUploadResultDto[];
}
