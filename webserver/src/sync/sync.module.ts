import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { ScansModule } from '../scans/scans.module.js';

@Module({
  imports: [ScansModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
