import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Network } from './entities/network.entity';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { QueryNetworksDto } from './dto/query-networks.dto';

const SORT_CONFIG: Record<string, { alias: string; expr: string; aggregated: boolean }> = {
  safety_score: { alias: 'avg_safety_score', expr: 'AVG(scan.safety_score)', aggregated: true },
  total_scans: { alias: 'total_scans', expr: 'COUNT(scan.server_scan_id)', aggregated: true },
  last_scanned_at: { alias: 'last_scanned_at', expr: 'MAX(scan.started_at)', aggregated: true },
  ssid: { alias: 'ssid', expr: 'network.ssid', aggregated: false },
};

function encodeCursor(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeCursor(raw: string): { id?: string; dir?: string } | null {
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function flipOrder(order: 'ASC' | 'DESC'): 'ASC' | 'DESC' {
  return order === 'DESC' ? 'ASC' : 'DESC';
}

@Injectable()
export class NetworksService {
  constructor(
    @InjectRepository(Network)
    private readonly networksRepository: Repository<Network>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(Attack)
    private readonly attacksRepository: Repository<Attack>,
  ) {}

  async findAll(query: QueryNetworksDto) {
    const perPage = query.per_page ?? 20;
    const sortField = query.sort ?? 'last_scanned_at';
    const sortOrder: 'ASC' | 'DESC' = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const config = SORT_CONFIG[sortField];

    const qb = this.networksRepository
      .createQueryBuilder('network')
      .leftJoin('network.scans', 'scan')
      .select([
        'network.id AS id',
        'network.ssid AS ssid',
        'network.bssid AS bssid',
        'network.gps_latitude AS gps_latitude',
        'network.gps_longitude AS gps_longitude',
        'AVG(scan.safety_score) AS avg_safety_score',
        'COUNT(scan.server_scan_id) AS total_scans',
        'MAX(scan.started_at) AS last_scanned_at',
      ])
      .groupBy('network.id');

    // filters
    if (query.search) {
      qb.andWhere('network.ssid ILIKE :search', { search: `%${query.search}%` });
    }
    if (query.bssid) {
      qb.andWhere('UPPER(network.bssid) = UPPER(:bssid)', { bssid: query.bssid });
    }
    if (query.lat != null && query.lng != null && query.radius_km != null) {
      qb.andWhere('network.gps_latitude IS NOT NULL')
        .andWhere('network.gps_longitude IS NOT NULL')
        .andWhere(
          `(6371 * acos(
            cos(radians(:lat)) * cos(radians(network.gps_latitude)) *
            cos(radians(network.gps_longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(network.gps_latitude))
          )) <= :radius`,
          { lat: query.lat, lng: query.lng, radius: query.radius_km },
        );
    }
    if (query.min_scans) {
      qb.having('COUNT(scan.server_scan_id) >= :minScans', { minScans: query.min_scans });
    }

    const countQb = qb.clone();

    // Cursor 
    const decoded = query.cursor ? decodeCursor(query.cursor) : null;
    const isReversed = decoded?.dir === 'prev';
    if (decoded?.id) {
      await this.applyKeysetCondition(qb, config, decoded.id, isReversed, sortOrder);
    }

    const effectiveSort = isReversed ? flipOrder(sortOrder) : sortOrder;
    const effectiveIdSort = isReversed ? 'DESC' : 'ASC';
    qb.orderBy(`"${config.alias}"`, effectiveSort, 'NULLS LAST');
    qb.addOrderBy('"id"', effectiveIdSort);
    qb.limit(perPage + 1);

    // Run queries 
    const [rows, countResult] = await Promise.all([
      qb.getRawMany(),
      countQb.select('COUNT(*) OVER() AS full_count').limit(1).getRawOne(),
    ]);

    const hasMore = rows.length > perPage;
    if (hasMore) rows.pop();
    if (isReversed) rows.reverse();

    // all results
    const total = countResult ? parseInt(countResult.full_count, 10) : 0;
    
    // last score + top attack queries
    const networkIds = rows.map((r) => r.id);
    const [lastScoresMap, topAttacksMap] = networkIds.length > 0
      ? await Promise.all([this.fetchLastScores(networkIds), this.fetchTopAttacks(networkIds)])
      : [{}, {}];


    // map results 
    const networks = rows.map((row) => ({
      id: row.id,
      ssid: row.ssid,
      bssid: row.bssid,
      avg_safety_score: row.avg_safety_score ? parseFloat(parseFloat(row.avg_safety_score).toFixed(2)) : null,
      total_scans: parseInt(row.total_scans, 10),
      last_scanned_at: row.last_scanned_at ? new Date(row.last_scanned_at).toISOString() : null,
      last_safety_score: lastScoresMap[row.id] ?? null,
      top_attacks: topAttacksMap[row.id] ?? [],
      gps_latitude: row.gps_latitude ? parseFloat(row.gps_latitude) : null,
      gps_longitude: row.gps_longitude ? parseFloat(row.gps_longitude) : null,
    }));

    // new cursors 
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    if (rows.length > 0) {
      if (isReversed || hasMore) nextCursor = encodeCursor({ id: rows[rows.length - 1].id });
      if (isReversed ? hasMore : !!query.cursor) prevCursor = encodeCursor({ id: rows[0].id, dir: 'prev' });
    }

    return { networks, total, next_cursor: nextCursor, prev_cursor: prevCursor };
  }

  private async applyKeysetCondition(
    qb: ReturnType<Repository<Network>['createQueryBuilder']>,
    config: (typeof SORT_CONFIG)[string],
    cursorId: string,
    isReversed: boolean,
    sortOrder: 'ASC' | 'DESC',
  ) {
    const cursorRow = await this.networksRepository
      .createQueryBuilder('network')
      .leftJoin('network.scans', 'scan')
      .where('network.id = :cursorId', { cursorId })
      .select([`${config.expr} AS sort_val`])
      .groupBy('network.id')
      .getRawOne();

    const cursorValue = cursorRow?.sort_val ?? null;
    const effectiveOrder = isReversed ? flipOrder(sortOrder) : sortOrder;
    const comp = effectiveOrder === 'DESC' ? '<' : '>';
    const idComp = isReversed ? '<' : '>';
    const params: Record<string, any> = { cursorId };

    let condition: string;
    if (cursorValue == null) {
      condition = `(${config.expr} IS NULL AND network.id ${idComp} :cursorId)`;
    } else {
      params.cursorVal = cursorValue;
      const nullClause = effectiveOrder === 'DESC' ? ` OR (${config.expr} IS NULL)` : '';
      condition = `((${config.expr} ${comp} :cursorVal) OR (${config.expr} = :cursorVal AND network.id ${idComp} :cursorId)${nullClause})`;
    }

    if (config.aggregated) {
      qb.andHaving(condition, params);
    } else {
      qb.andWhere(condition, params);
    }
  }

  private async fetchLastScores(networkIds: string[]): Promise<Record<string, number>> {
    const rows = await this.scansRepository
      .createQueryBuilder('scan')
      .where('scan.network_id IN (:...networkIds)', { networkIds })
      .andWhere(
        'scan.started_at = (SELECT MAX(s2.started_at) FROM scans s2 WHERE s2.network_id = scan.network_id)',
      )
      .select(['scan.network_id AS network_id', 'scan.safety_score AS safety_score'])
      .getRawMany();

    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.network_id] = parseFloat(row.safety_score);
    }
    return map;
  }

  private async fetchTopAttacks(networkIds: string[]): Promise<Record<string, string[]>> {
    const rows = await this.attacksRepository
      .createQueryBuilder('attack')
      .innerJoin('attack.scan', 'scan')
      .where('scan.network_id IN (:...networkIds)', { networkIds })
      .select([
        'scan.network_id AS network_id',
        'attack.attack_type AS attack_type',
        'COUNT(*) AS cnt',
      ])
      .groupBy('scan.network_id')
      .addGroupBy('attack.attack_type')
      .orderBy('cnt', 'DESC')
      .getRawMany();

    const map: Record<string, string[]> = {};
    for (const row of rows) {
      if (!map[row.network_id]) map[row.network_id] = [];
      if (map[row.network_id].length < 5) map[row.network_id].push(row.attack_type);
    }
    return map;
  }

  async findOne(networkId: string) {
    const network = await this.networksRepository.findOne({ where: { id: networkId } });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const stats = await this.scansRepository
      .createQueryBuilder('scan')
      .where('scan.network_id = :networkId', { networkId })
      .select([
        'AVG(scan.safety_score) AS avg_safety_score',
        'MIN(scan.safety_score) AS min_safety_score',
        'MAX(scan.safety_score) AS max_safety_score',
        'COUNT(scan.server_scan_id) AS total_scans',
        'COUNT(DISTINCT scan.user_id) AS total_users_scanned',
      ])
      .getRawOne();

    const attacks = await this.attacksRepository
      .createQueryBuilder('attack')
      .innerJoin('attack.scan', 'scan')
      .where('scan.network_id = :networkId', { networkId })
      .select([
        'attack.attack_type AS attack_type',
        'COUNT(*) AS count',
        'AVG(attack.confidence) AS avg_confidence',
      ])
      .groupBy('attack.attack_type')
      .getRawMany();

    const attackSummary: Record<string, { count: number; avg_confidence: number }> = {};
    for (const row of attacks) {
      attackSummary[row.attack_type] = {
        count: parseInt(row.count, 10),
        avg_confidence: parseFloat(parseFloat(row.avg_confidence).toFixed(2)),
      };
    }

    const recentScans = await this.scansRepository
      .createQueryBuilder('scan')
      .where('scan.network_id = :networkId', { networkId })
      .leftJoinAndSelect('scan.attacks', 'attack')
      .orderBy('scan.started_at', 'DESC')
      .take(10)
      .getMany();

    const scanHistory = recentScans.map((scan) => ({
      date: scan.started_at.toISOString().split('T')[0],
      safety_score: scan.safety_score,
      attacks: scan.attacks.map((a) => ({
        attack_type: a.attack_type,
        severity: a.severity,
        confidence: a.confidence,
      })),
    }));

    return {
      id: network.id,
      ssid: network.ssid,
      bssid: network.bssid,
      channel: network.channel,
      encryption_type: network.encryption_type,
      avg_safety_score: stats.avg_safety_score ? parseFloat(parseFloat(stats.avg_safety_score).toFixed(1)) : null,
      min_safety_score: stats.min_safety_score ? parseFloat(stats.min_safety_score) : null,
      max_safety_score: stats.max_safety_score ? parseFloat(stats.max_safety_score) : null,
      total_scans: parseInt(stats.total_scans, 10),
      total_users_scanned: parseInt(stats.total_users_scanned, 10),
      attack_summary: attackSummary,
      scan_history: scanHistory,
    };
  }
}