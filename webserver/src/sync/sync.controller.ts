import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SyncService } from './sync.service.js';
import { SyncStatusQueryDto } from './dto/sync-status-query.dto.js';
import { BatchUploadDto } from './dto/batch-upload.dto.js';
import { ScanUploadDto } from './dto/scan-upload.dto.js';
import { Scan } from 'src/scans/entities/scan.entity.js';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  async getStatus(
    @CurrentUser() user: { user_id: string },
    @Query() query: SyncStatusQueryDto,
  ) {
    return this.syncService.getStatus(user.user_id, query);
  }

  @Post('batch')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.MULTI_STATUS)
  async batchUpload(
    @CurrentUser() user: { user_id: string },
    @Body() dto: BatchUploadDto,
  ) {
    return this.syncService.batchUpload(user.user_id, dto);
  }

  @Post()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    async create(
      @CurrentUser() user: { user_id: string },
      @Body() dto: ScanUploadDto,
    ) {
      return this.syncService.uploadScan(user.user_id, dto);
    }
  
}
