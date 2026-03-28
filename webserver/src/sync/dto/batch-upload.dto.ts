import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ScanUploadDto } from './scan-upload.dto';

export class BatchUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => ScanUploadDto)
  scans: ScanUploadDto[];
}
