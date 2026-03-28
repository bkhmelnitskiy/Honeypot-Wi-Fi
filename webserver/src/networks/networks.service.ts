import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Network } from './entities/network.entity';
import { QueryNetworksDto } from './dto/query-networks.dto';
import { encodeCursor, decodeCursor, flipOrder } from '../common/utils/cursor';
import { NetworksQueryRepository, SORT_CONFIG } from './networks-query.repository';

@Injectable()
export class NetworksService {
  constructor(
    @InjectRepository(Network)
    private readonly networksRepository: Repository<Network>,
    private readonly queryRepo: NetworksQueryRepository,
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
      await this.queryRepo.applyKeysetCondition(qb, config, decoded.id, isReversed, sortOrder);
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

    const total = countResult ? parseInt(countResult.full_count, 10) : 0;

    // last score + top attack queries
    const networkIds = rows.map((r) => r.id);
    const [lastScoresMap, topAttacksMap] = networkIds.length > 0
      ? await Promise.all([this.queryRepo.fetchLastScores(networkIds), this.queryRepo.fetchTopAttacks(networkIds)])
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

    // cursors
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    if (rows.length > 0) {
      if (isReversed || hasMore) nextCursor = encodeCursor({ id: rows[rows.length - 1].id });
      if (isReversed ? hasMore : !!query.cursor) prevCursor = encodeCursor({ id: rows[0].id, dir: 'prev' });
    }

    return { networks, total, next_cursor: nextCursor, prev_cursor: prevCursor };
  }

  async findOne(networkId: string) {
    const network = await this.networksRepository.findOne({ where: { id: networkId } });
    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const [stats, attackSummary, recentScans] = await Promise.all([
      this.queryRepo.fetchNetworkStats(networkId),
      this.queryRepo.fetchAttackSummary(networkId),
      this.queryRepo.fetchRecentScans(networkId),
    ]);

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