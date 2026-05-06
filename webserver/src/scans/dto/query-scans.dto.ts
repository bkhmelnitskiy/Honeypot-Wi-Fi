import { IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryScansDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Substring match against network SSID or BSSID (case-insensitive)',
    example: 'HomeWiFi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @ApiProperty({ required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  since?: string;
}
