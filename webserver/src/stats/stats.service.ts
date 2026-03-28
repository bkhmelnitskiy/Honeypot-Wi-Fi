import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { Network } from '../networks/entities/network.entity';
import { User } from '../users/entities/user.entity';
import { QueryAttacksDto } from './dto/query-attacks.dto';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(Attack)
    private readonly attacksRepository: Repository<Attack>,
    @InjectRepository(Network)
    private readonly networksRepository: Repository<Network>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getGlobalStats() {
    const scanStatsQb = this.scansRepository.createQueryBuilder('scan')
      .select('COUNT(*)', 'total_scans')
      .addSelect('AVG(scan.safety_score)', 'avg_safety_score');

    const attackDistQb = this.attacksRepository.createQueryBuilder('attack')
      .select('attack.attack_type', 'attack_type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('attack.attack_type');

    const scansPerDayQb = this.scansRepository.createQueryBuilder('scan')
      .select("DATE_TRUNC('day', scan.started_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy("DATE_TRUNC('day', scan.started_at)")
      .orderBy("DATE_TRUNC('day', scan.started_at)", 'DESC')
      .limit(30);

    const topDangerousQb = this.networksRepository.createQueryBuilder('network')
      .leftJoin('network.scans', 'scan')
      .leftJoin('scan.attacks', 'attack')
      .select('network.id', 'id')
      .addSelect('network.ssid', 'ssid')
      .addSelect('network.bssid', 'bssid')
      .addSelect('AVG(scan.safety_score)', 'avg_safety_score')
      .addSelect('COUNT(DISTINCT scan.server_scan_id)', 'total_scans')
      .groupBy('network.id')
      .addGroupBy('network.ssid')
      .addGroupBy('network.bssid')
      .having('COUNT(scan.server_scan_id) > 0')
      .orderBy('avg_safety_score', 'ASC')
      .limit(10);

    const topAttacksSubQb = this.attacksRepository.createQueryBuilder('a')
      .innerJoin('a.scan', 's')
      .select('s.network_id', 'network_id')
      .addSelect('a.attack_type', 'attack_type')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('s.network_id')
      .addGroupBy('a.attack_type')
      .orderBy('cnt', 'DESC');

    const topContributorsQb = this.usersRepository.createQueryBuilder('user')
      .leftJoin('user.scans', 'scan')
      .select('user.display_name', 'display_name')
      .addSelect('COUNT(scan.server_scan_id)', 'total_scans')
      .addSelect('COUNT(DISTINCT scan.network_id)', 'total_networks')
      .groupBy('user.user_id')
      .addGroupBy('user.display_name')
      .having('COUNT(scan.server_scan_id) > 0')
      .orderBy('total_scans', 'DESC')
      .limit(10);

    const [
      scanStats,
      totalNetworks,
      totalUsers,
      attackDistRows,
      scansPerDayRows,
      topDangerousRows,
      topAttackRows,
      topContributorRows,
    ] = await Promise.all([
      scanStatsQb.getRawOne(),
      this.networksRepository.count(),
      this.usersRepository.count(),
      attackDistQb.getRawMany(),
      scansPerDayQb.getRawMany(),
      topDangerousQb.getRawMany(),
      topAttacksSubQb.getRawMany(),
      topContributorsQb.getRawMany(),
    ]);

    // attack_distribution: object { "ARP_SPOOFING": 2854, ... }
    const attackDistribution: Record<string, number> = {};
    for (const row of attackDistRows) {
      attackDistribution[row.attack_type] = parseInt(row.count, 10);
    }

    // scans_per_day: array of { date, count }
    const scansPerDay = scansPerDayRows.map((row) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      count: parseInt(row.count, 10),
    }));

    // top_attacks lookup per network
    const topAttacksMap: Record<string, string[]> = {};
    for (const row of topAttackRows) {
      if (!topAttacksMap[row.network_id]) topAttacksMap[row.network_id] = [];
      if (topAttacksMap[row.network_id].length < 5) topAttacksMap[row.network_id].push(row.attack_type);
    }

    // top_dangerous_networks
    const topDangerousNetworks = topDangerousRows.map((row) => ({
      id: row.id,
      ssid: row.ssid,
      bssid: row.bssid,
      avg_safety_score: row.avg_safety_score ? parseFloat(parseFloat(row.avg_safety_score).toFixed(2)) : null,
      total_scans: parseInt(row.total_scans, 10),
      top_attacks: topAttacksMap[row.id] ?? [],
    }));

    // top_contributors
    const topContributors = topContributorRows.map((row) => ({
      display_name: row.display_name,
      total_scans: parseInt(row.total_scans, 10),
      total_networks: parseInt(row.total_networks, 10),
    }));

    return {
      total_scans: parseInt(scanStats.total_scans, 10),
      total_networks: totalNetworks,
      total_users: totalUsers,
      avg_safety_score: scanStats.avg_safety_score ? parseFloat(parseFloat(scanStats.avg_safety_score).toFixed(2)) : null,
      attack_distribution: attackDistribution,
      scans_per_day: scansPerDay,
      top_dangerous_networks: topDangerousNetworks,
      top_contributors: topContributors,
    };
  }

  async getAttackStats(query: QueryAttacksDto) {
    const { type, since, network_id } = query;

    // Main stats
    const mainQb = this.attacksRepository.createQueryBuilder('attack');
    if (network_id) mainQb.innerJoin('attack.scan', 'scan');
    if (type) mainQb.andWhere('attack.attack_type = :type', { type });
    if (since) mainQb.andWhere('attack.detected_at >= :since', { since });
    if (network_id) mainQb.andWhere('scan.network_id = :networkId', { networkId: network_id });

    mainQb
      .select('attack.attack_type::text', 'attack_type')
      .addSelect('COUNT(*)', 'total_detections')
      .addSelect('AVG(attack.confidence)', 'avg_confidence')
      .groupBy('attack.attack_type');

    // Severity distribution (same filters)
    const sevQb = this.attacksRepository.createQueryBuilder('attack');
    if (network_id) sevQb.innerJoin('attack.scan', 'scan');
    if (type) sevQb.andWhere('attack.attack_type = :type', { type });
    if (since) sevQb.andWhere('attack.detected_at >= :since', { since });
    if (network_id) sevQb.andWhere('scan.network_id = :networkId', { networkId: network_id });

    sevQb
      .select('attack.severity::text', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('attack.severity');

    // Weekly trend (same filters)
    const trendQb = this.attacksRepository.createQueryBuilder('attack');
    if (network_id) trendQb.innerJoin('attack.scan', 'scan');
    if (type) trendQb.andWhere('attack.attack_type = :type', { type });
    if (since) trendQb.andWhere('attack.detected_at >= :since', { since });
    if (network_id) trendQb.andWhere('scan.network_id = :networkId', { networkId: network_id });

    trendQb
      .select("to_char(DATE_TRUNC('week', attack.detected_at), 'IYYY-\"W\"IW')", 'week')
      .addSelect('COUNT(*)', 'count')
      .groupBy("DATE_TRUNC('week', attack.detected_at)")
      .orderBy("DATE_TRUNC('week', attack.detected_at)", 'DESC');

    const [mainRows, sevRows, trendRows] = await Promise.all([
      mainQb.getRawMany(),
      sevQb.getRawMany(),
      trendQb.getRawMany(),
    ]);

    // If filtering by type, return single object; otherwise aggregate all
    const totalDetections = mainRows.reduce((sum, r) => sum + parseInt(r.total_detections, 10), 0);
    const avgConfidence = mainRows.length > 0
      ? parseFloat((mainRows.reduce((sum, r) => sum + parseFloat(r.avg_confidence), 0) / mainRows.length).toFixed(2))
      : null;

    // severity_distribution: object { "LOW": 412, ... }
    const severityDistribution: Record<string, number> = {};
    for (const row of sevRows) {
      severityDistribution[row.severity] = parseInt(row.count, 10);
    }

    // trend: array of { week, count }
    const trend = trendRows.map((row) => ({
      week: row.week,
      count: parseInt(row.count, 10),
    }));

    return {
      attack_type: type ? type.toUpperCase() : 'ALL',
      total_detections: totalDetections,
      avg_confidence: avgConfidence,
      severity_distribution: severityDistribution,
      trend,
    };
  }
}