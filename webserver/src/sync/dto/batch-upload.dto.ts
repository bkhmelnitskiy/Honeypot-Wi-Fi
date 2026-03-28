import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScanDto } from './scan-upload.dto.js';

export class BatchUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => CreateScanDto)
  scans: CreateScanDto[];
}
