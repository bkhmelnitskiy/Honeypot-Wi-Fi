import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScansController } from './scans.controller.js';
import { ScansService } from './scans.service.js';
import { Scan } from './entities/scan.entity.js';
import { Attack } from './entities/attack.entity.js';
import { Network } from '../networks/entities/network.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, Attack, Network])],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService],
})
export class ScansModule {}
