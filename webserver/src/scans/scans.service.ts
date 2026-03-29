import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from './entities/scan.entity';
import { QueryScansDto } from './dto/query-scans.dto';
import { NetworksService } from '../networks/networks.service';
import { encodeCursor, decodeCursor } from '../common/utils/cursor';

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    private readonly networksService: NetworksService,
  ) {}

  async findAll(userId: string, query: QueryScansDto) {
    const perPage = query.per_page ?? 20;

    const qb = this.scansRepository
      .createQueryBuilder('scan')
      .leftJoinAndSelect('scan.attacks', 'attack')
      .leftJoinAndSelect('scan.network', 'network')
      .where('scan.user_id = :userId', { userId });

    if (query.network_id) {
      qb.andWhere('scan.network_id = :networkId', { networkId: query.network_id });
    }
    if (query.since) {
      qb.andWhere('scan.started_at >= :since', { since: query.since });
    }

    const countQb = qb.clone();

    // Cursor 
    const decoded = query.cursor ? decodeCursor(query.cursor) : null;
    const isReversed = decoded?.dir === 'prev';

    if (decoded?.id) {
      const cursorScan = await this.scansRepository.findOne({
        where: { server_scan_id: decoded.id, user_id: userId },
        select: ['server_scan_id', 'started_at'],
      });

      if (cursorScan) {
        const comp = isReversed ? '>' : '<';
        const idComp = isReversed ? '<' : '>';
        qb.andWhere(
          `(scan.started_at ${comp} :cursorDate OR (scan.started_at = :cursorDate AND scan.server_scan_id ${idComp} :cursorId))`,
          { cursorDate: cursorScan.started_at, cursorId: decoded.id },
        );
      }
    }

    const sortDir = isReversed ? 'ASC' : 'DESC';
    const idDir = isReversed ? 'DESC' : 'ASC';
    qb.orderBy('scan.started_at', sortDir)
      .addOrderBy('scan.server_scan_id', idDir)
      .take(perPage + 1);

    const [rows, total] = await Promise.all([
      qb.getMany(),
      countQb.getCount(),
    ]);

    const hasMore = rows.length > perPage;
    if (hasMore) rows.pop();
    if (isReversed) rows.reverse();

    const scans = rows.map((scan) => ({
      server_scan_id: scan.server_scan_id,
      client_scan_id: scan.client_scan_id,
      network: {
        id: scan.network.id,
        ssid: scan.network.ssid,
        bssid: scan.network.bssid,
      },
      safety_score: scan.safety_score,
      scan_duration_sec: scan.scan_duration_sec,
      attacks: scan.attacks.map((a) => ({
        attack_type: a.attack_type,
        severity: a.severity,
        confidence: a.confidence,
        detected_at: a.detected_at,
        details: a.details,
      })),
      device_hardware_id: scan.device_hardware_id,
      firmware_version: scan.firmware_version,
      started_at: scan.started_at.toISOString(),
      completed_at: scan.completed_at.toISOString(),
    }));

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    if (rows.length > 0) {
      if (isReversed || hasMore)
        nextCursor = encodeCursor({ id: rows[rows.length - 1].server_scan_id });
      if (isReversed ? hasMore : !!query.cursor)
        prevCursor = encodeCursor({ id: rows[0].server_scan_id, dir: 'prev' });
    }

    return { scans, total, next_cursor: nextCursor, prev_cursor: prevCursor, per_page: perPage };
  }

  async findOne(userId: string, scanId: string) {
    const scan = await this.scansRepository.findOne({
      where: { server_scan_id: scanId, user_id: userId },
      relations: ['attacks', 'network'],
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    const net = await this.networksService.findOne(scan.network.id);

    return {
      server_scan_id: scan.server_scan_id,
      client_scan_id: scan.client_scan_id,
      network: {
        id: scan.network.id,
        ssid: scan.network.ssid,
        bssid: scan.network.bssid,
        channel: scan.network.channel,
        avg_safety_score: net ? net.avg_safety_score : null,
        min_safety_score: net ? net.min_safety_score : null,
        max_safety_score: net ? net.max_safety_score : null,
        total_scans: net ? net.total_scans : null,
        total_users_scanned: net ? net.total_users_scanned : null,
        attack_summary: net ? net.attack_summary : null,
        scan_history: net ? net.scan_history : null,
      },
      safety_score: scan.safety_score,
      scan_duration_sec: scan.scan_duration_sec,
      attacks: scan.attacks.map((a) => ({
        attack_type: a.attack_type,
        severity: a.severity,
        confidence: a.confidence,
        detected_at: a.detected_at,
        details: a.details,
      })),
      device_hardware_id: scan.device_hardware_id,
      firmware_version: scan.firmware_version,
      started_at: scan.started_at.toISOString(),
      completed_at: scan.completed_at.toISOString(),
    };
  }
}