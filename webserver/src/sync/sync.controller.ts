import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncStatusQueryDto } from './dto/sync-status-query.dto';
import { SyncUpdatesQueryDto } from './dto/sync-updates-query.dto';
import { BatchUploadDto } from './dto/batch-upload.dto';
import { ScanUploadDto } from './dto/scan-upload.dto';
import { SyncStatusResponseDto } from './dto/sync-status-response.dto';
import { SyncUpdatesResponseDto } from './dto/sync-updates-response.dto';
import { BatchUploadResponseDto } from './dto/batch-upload-response.dto';
import { UploadScanResponseDto } from './dto/sync-response.dto';

@ApiTags('Sync')
@ApiBearerAuth('access-token')
@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check how many records have been updated since a given timestamp' })
  @ApiResponse({ status: 200, type: SyncStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(
    @CurrentUser() user: { user_id: string },
    @Query() query: SyncStatusQueryDto,
  ) {
    return this.syncService.getStatus(user.user_id, query);
  }

  @Get(':since')
  @ApiOperation({ summary: 'Fetch network and stats updates since a timestamp' })
  @ApiParam({ name: 'since', description: 'ISO 8601 timestamp', example: '2024-01-01T00:00:00Z' })
  @ApiResponse({ status: 200, type: SyncUpdatesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUpdates(
    @CurrentUser() user: { user_id: string },
    @Param('since') since: string,
    @Query() query: SyncUpdatesQueryDto,
  ) {
    return this.syncService.getUpdates(user.user_id, since, query);
  }

  @Post('batch')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.MULTI_STATUS)
  @ApiOperation({ summary: 'Upload up to 50 scans in a single request' })
  @ApiResponse({ status: 207, description: 'Per-scan CREATED/REJECTED results', type: BatchUploadResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async batchUpload(
    @CurrentUser() user: { user_id: string },
    @Body() dto: BatchUploadDto,
  ) {
    return this.syncService.batchUpload(user.user_id, dto);
  }

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Upload a single scan' })
  @ApiResponse({ status: 201, type: UploadScanResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(
    @CurrentUser() user: { user_id: string },
    @Body() dto: ScanUploadDto,
  ) {
    return this.syncService.uploadScan(user.user_id, dto);
  }
}
