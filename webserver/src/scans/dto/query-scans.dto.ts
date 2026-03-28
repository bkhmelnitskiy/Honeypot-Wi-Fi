import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryScansDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  network_id?: string;

  @IsOptional()
  @IsDateString()
  since?: string;
}
