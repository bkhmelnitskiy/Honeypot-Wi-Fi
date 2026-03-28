import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Network } from './entities/network.entity';
import { QueryNetworksDto } from './dto/query-networks.dto';

@Injectable()
export class NetworksService {
  constructor(
    @InjectRepository(Network)
    private readonly networksRepository: Repository<Network>,
  ) {}

  async findAll(query: QueryNetworksDto) {
    // TODO: implement with search, geo filtering, cursor pagination, aggregated stats
    return { networks: [], total: 0, next_cursor: null, prev_cursor: null };
  }

  async findOne(networkId: string) {
    // TODO: implement with attack_summary, scan_history, aggregated scores
    return this.networksRepository.findOne({ where: { id: networkId } });
  }
}
