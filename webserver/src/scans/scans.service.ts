import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from './entities/scan.entity';
import { QueryScansDto } from './dto/query-scans.dto';

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
  ) {}


  async findAll(userId: string, query: QueryScansDto) {
    // TODO: implement cursor-based pagination
    return { scans: [], total: 0, next_cursor: null, prev_cursor: null, per_page: query.per_page };
  }

  async findOne(userId: string, scanId: string) {
    // TODO: implement with ownership check
    return this.scansRepository.findOne({
      where: { server_scan_id: scanId, user_id: userId },
      relations: ['attacks', 'network'],
    });
  }
}
