import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworksController } from './networks.controller';
import { NetworksService } from './networks.service';
import { Network } from './entities/network.entity';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Network, Scan, Attack])],
  controllers: [NetworksController],
  providers: [NetworksService],
  exports: [NetworksService],
})
export class NetworksModule {}
