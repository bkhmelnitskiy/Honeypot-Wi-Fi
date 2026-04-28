import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RegisterResponseDto {
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
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Expose()
  access_token!: string;

  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...' })
  @Expose()
  refresh_token!: string;

  @ApiProperty({ example: 900 })
  @Expose()
  expires_in!: number;

  @ApiProperty({ example: 604800 })
  @Expose()
  refresh_expires_in!: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  user_id!: string;

  @ApiProperty({ example: 'Alice' })
  @Expose()
  display_name!: string;
}

export class TokensResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Expose()
  access_token!: string;

  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...' })
  @Expose()
  refresh_token!: string;

  @ApiProperty({ example: 900 })
  @Expose()
  expires_in!: number;

  @ApiProperty({ example: 604800 })
  @Expose()
  refresh_expires_in!: number;
}
