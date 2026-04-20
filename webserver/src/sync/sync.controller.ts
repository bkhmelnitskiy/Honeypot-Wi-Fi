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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncStatusQueryDto } from './dto/sync-status-query.dto';
import { SyncUpdatesQueryDto } from './dto/sync-updates-query.dto';
import { BatchUploadDto } from './dto/batch-upload.dto';
import { ScanUploadDto } from './dto/scan-upload.dto';

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

  @Get(':since')
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
