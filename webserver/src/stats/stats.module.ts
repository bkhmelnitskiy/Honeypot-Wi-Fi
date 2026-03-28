import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { Network } from '../networks/entities/network.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, Attack, Network, User])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}