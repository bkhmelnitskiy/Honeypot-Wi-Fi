import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Network } from './entities/network.entity';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { flipOrder } from '../common/utils/cursor';

export const SORT_CONFIG: Record<string, { alias: string; expr: string; aggregated: boolean }> = {
  safety_score: { alias: 'avg_safety_score', expr: 'AVG(scan.safety_score)', aggregated: true },
  total_scans: { alias: 'total_scans', expr: 'COUNT(scan.server_scan_id)', aggregated: true },
  last_scanned_at: { alias: 'last_scanned_at', expr: 'MAX(scan.started_at)', aggregated: true },
  ssid: { alias: 'ssid', expr: 'network.ssid', aggregated: false },
};

@Injectable()
export class NetworksQueryRepository {
  constructor(
    @InjectRepository(Network)
    private readonly networksRepository: Repository<Network>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(Attack)
    private readonly attacksRepository: Repository<Attack>,
  ) {}

  async applyKeysetCondition(
    qb: SelectQueryBuilder<Network>,
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

  async fetchLastScores(networkIds: string[]): Promise<Record<string, number>> {
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

  async fetchTopAttacks(networkIds: string[]): Promise<Record<string, string[]>> {
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

  async fetchNetworkStats(networkId: string) {
    return this.scansRepository
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
  }

  async fetchAttackSummary(networkId: string) {
    const rows = await this.attacksRepository
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

    const summary: Record<string, { count: number; avg_confidence: number }> = {};
    for (const row of rows) {
      summary[row.attack_type] = {
        count: parseInt(row.count, 10),
        avg_confidence: parseFloat(parseFloat(row.avg_confidence).toFixed(2)),
      };
    }
    return summary;
  }

  async fetchRecentScans(networkId: string, limit = 10) {
    return this.scansRepository
      .createQueryBuilder('scan')
      .where('scan.network_id = :networkId', { networkId })
      .leftJoinAndSelect('scan.attacks', 'attack')
      .orderBy('scan.started_at', 'DESC')
      .take(limit)
      .getMany();
  }
}