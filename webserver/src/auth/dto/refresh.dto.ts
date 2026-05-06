import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. Optional when sent via httpOnly cookie (web clients). Required for non-cookie clients (mobile, API).',
    example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
