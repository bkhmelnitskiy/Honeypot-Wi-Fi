import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { Scan } from './entities/scan.entity';
import { Attack } from './entities/attack.entity';
import { Network } from '../networks/entities/network.entity';
import { NetworksModule } from '../networks/networks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Scan, Attack, Network]), NetworksModule],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService],
})
export class ScansModule {}
