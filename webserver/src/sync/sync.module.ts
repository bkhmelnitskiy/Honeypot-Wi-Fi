import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { ScansModule } from '../scans/scans.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from 'src/scans/entities/scan.entity';
import { Attack } from 'src/scans/entities/attack.entity';
import { Network } from 'src/networks/entities/network.entity';

@Module({
  imports: [ScansModule, TypeOrmModule.forFeature([Scan, Attack,Network])],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
