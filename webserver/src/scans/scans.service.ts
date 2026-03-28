import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from './entities/scan.entity.js';
import { QueryScansDto } from './dto/query-scans.dto.js';

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
  ) {}

  async create(userId: string, dto: CreateScanDto) {
    // TODO: implement scan creation with network upsert and payload_hash verification
    return { server_scan_id: '', network_id: '', accepted: true };
  }

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
