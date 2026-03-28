import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworksController } from './networks.controller';
import { NetworksService } from './networks.service';
import { Network } from './entities/network.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Network])],
  controllers: [NetworksController],
  providers: [NetworksService],
  exports: [NetworksService],
})
export class NetworksModule {}
