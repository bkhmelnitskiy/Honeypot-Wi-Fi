import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ScanUploadDto } from './scan-upload.dto';

export class BatchUploadDto {
  @ApiProperty({ type: () => [ScanUploadDto], maxItems: 50 })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => ScanUploadDto)
  scans: ScanUploadDto[];
}
