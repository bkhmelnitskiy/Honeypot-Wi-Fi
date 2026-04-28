import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProfileResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  user_id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'Alice' })
  @Expose()
  display_name!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  created_at!: Date;

  @ApiProperty({ example: 42 })
  @Expose()
  total_scans!: number;

  @ApiProperty({ example: 15 })
  @Expose()
  total_networks_scanned!: number;
}

export class UpdateProfileResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  user_id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'Alice' })
  @Expose()
  display_name!: string;

  @ApiProperty({ example: '2024-06-01T12:00:00.000Z' })
  @Expose()
  updated_at!: string;
}
