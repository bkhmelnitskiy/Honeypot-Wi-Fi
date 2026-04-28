import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScansService } from './scans.service';
import { QueryScansDto } from './dto/query-scans.dto';
import { ScanListResponseDto, ScanDetailResponseDto } from './dto/scan-response.dto';

@ApiTags('Scans')
@ApiBearerAuth('access-token')
@Controller('scans')
@UseGuards(JwtAuthGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get()
  @ApiOperation({ summary: 'List scans for the authenticated user (cursor-paginated)' })
  @ApiResponse({ status: 200, type: ScanListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { user_id: string },
    @Query() query: QueryScansDto,
  ) {
    return this.scansService.findAll(user.user_id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details for a single scan by UUID' })
  @ApiParam({ name: 'id', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, type: ScanDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Scan not found' })
  async findOne(
    @CurrentUser() user: { user_id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scansService.findOne(user.user_id, id);
  }
}
