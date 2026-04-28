import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UploadScanResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  server_scan_id!: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  network_id!: string;

  @ApiProperty({ example: true })
  @Expose()
  accepted!: boolean;
}
