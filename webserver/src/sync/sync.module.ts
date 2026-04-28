import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { ScansModule } from '../scans/scans.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { Network } from '../networks/entities/network.entity';

@Module({
  imports: [ScansModule, TypeOrmModule.forFeature([Scan, Attack,Network])],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
