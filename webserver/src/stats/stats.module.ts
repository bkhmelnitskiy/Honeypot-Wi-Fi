import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';
import { Scan } from '../scans/entities/scan.entity.js';
import { Attack } from '../scans/entities/attack.entity.js';
import { Network } from '../networks/entities/network.entity.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, Attack, Network, User])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
