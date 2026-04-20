import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { SyncStatusQueryDto } from './dto/sync-status-query.dto';
import { BatchUploadDto } from './dto/batch-upload.dto';
import { Scan } from '../scans/entities/scan.entity';
import { Attack } from '../scans/entities/attack.entity';
import { Network } from '../networks/entities/network.entity';
import { SyncStatusResponseDto } from './dto/sync-status-response.dto';
import { ScanUploadDto } from './dto/scan-upload.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UploadScanResponseDto } from './dto/sync-response.dto';
import { SyncUpdatesQueryDto } from './dto/sync-updates-query.dto';
import { SyncUpdatesResponseDto } from './dto/sync-updates-response.dto';
import {
  BatchUploadResponseDto,
  BatchUploadResultDto,
} from './dto/batch-upload-response.dto';

const DEFAULT_SYNC_LIMIT = 100;
const MAX_SYNC_LIMIT = 500;


@Injectable()
export class SyncService {

  constructor(
    @InjectRepository(Scan)
    private scansRepository: Repository<Scan>,
    @InjectRepository(Attack)
    private attacksRepository: Repository<Attack>,
    @InjectRepository(Network)
    private networksRepository: Repository<Network>
  ) {}

  async getStatus(userId: string, query: SyncStatusQueryDto): Promise<SyncStatusResponseDto> {
    const since = query.since ? new Date(query.since) : new Date(0);

    if (Number.isNaN(since.getTime())) {
      throw new BadRequestException('Invalid "since" timestamp');
    }

    const updated_count = await this.networksRepository.count({
      where: { updated_at: MoreThan(since) },
    });

    return {
      updated_count,
      server_time: new Date().toISOString(),
    };
  }



  async getUpdates(
    userId: string,
    sinceParam: string,
    query: SyncUpdatesQueryDto,
  ): Promise<SyncUpdatesResponseDto> {
    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) {
      throw new BadRequestException('Invalid "since" timestamp');
    }

    const requestedLimit = query.limit ?? DEFAULT_SYNC_LIMIT;
    const limit = Math.min(requestedLimit, MAX_SYNC_LIMIT);

    const updated_networks = await this.networksRepository.find({
      where: { updated_at: MoreThan(since) },
      order: { updated_at: 'ASC' },
      take: limit + 1,
    });

    const has_more = updated_networks.length > limit;
    if (has_more) updated_networks.pop();

    const next_since = has_more
      ? updated_networks[updated_networks.length - 1].updated_at.toISOString()
      : new Date().toISOString();

    return {
      updated_networks,
      global_stats: {},
      has_more,
      next_since,
      server_time: new Date().toISOString(),
    };
  }

  async batchUpload(
    userId: string,
    dto: BatchUploadDto,
  ): Promise<BatchUploadResponseDto> {
    const results: BatchUploadResultDto[] = [];

    for (const scan of dto.scans) {
      try {
        const uploaded = await this.uploadScan(userId, scan);
        results.push({
          client_scan_id: scan.client_scan_id,
          status: 'CREATED',
          server_scan_id: uploaded.server_scan_id,
          error: null,
        });
      } catch (err) {
        results.push({
          client_scan_id: scan.client_scan_id,
          status: 'REJECTED',
          server_scan_id: null,
          error: this.mapBatchError(err),
        });
      }
    }

    return { results };
  }

  private mapBatchError(err: unknown): { error: string; message: string } {
    if (err instanceof ConflictException) {
      return { error: 'DUPLICATE', message: err.message };
    }
    if (err instanceof BadRequestException) {
      return { error: 'VALIDATION_FAILED', message: err.message };
    }
    return {
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }


  async uploadScan(userId: string, dto: ScanUploadDto): Promise<UploadScanResponseDto> {

    if (!this.checkHash(dto)) {
      throw new BadRequestException('Invalid payload hash');
    }

    const isDuplicate = await this.scansRepository.findOne({ where: { client_scan_id: dto.client_scan_id } });
    if (isDuplicate) {
      throw new ConflictException('Duplicate scan upload');
    }

    await this.networksRepository.upsert(
      {
        ssid: dto.network.ssid,
        bssid: dto.network.bssid,
        channel: dto.network.channel,
        encryption_type: dto.network.encryption_type,
        frequency_mhz: dto.network.frequency_mhz,
        gps_latitude: dto.network.gps_latitude,
        gps_longitude: dto.network.gps_longitude,
      },
      { conflictPaths: ['bssid'], skipUpdateIfNoValuesChanged: true }
    );
    const networkEntity = await this.networksRepository.findOneOrFail({ where: { bssid: dto.network.bssid } });
    const networkId = networkEntity.id;

    const scan = this.scansRepository.create({
      client_scan_id: dto.client_scan_id,
      safety_score: dto.safety_score,
      scan_duration_sec: dto.scan_duration_sec,
      scan_config: dto.scan_config,
      device_hardware_id: dto.device_hardware_id,
      firmware_version: dto.firmware_version,
      started_at: new Date(dto.started_at),   
      completed_at: new Date(dto.completed_at),
      payload_hash: dto.payload_hash,
      user_id: userId,
      network_id: networkId,
      attacks: dto.attacks.map((attack) => ({
        attack_type: attack.attack_type,
        severity: attack.severity,
        confidence: attack.confidence,
        detected_at: new Date(attack.detected_at),
        details: attack.details,
      })),
    });
    const saved = await this.scansRepository.save(scan);
    return {
      server_scan_id: saved.server_scan_id,
      network_id: saved.network_id,
      accepted: true,
    };
  }


  private checkHash(dto: ScanUploadDto): boolean {
    if (!dto.payload_hash) return true;

    const canonical = {
      client_scan_id: dto.client_scan_id,
      network: {
        ssid: dto.network.ssid,
        bssid: dto.network.bssid,
        channel: dto.network.channel,
        encryption_type: dto.network.encryption_type,
        frequency_mhz: dto.network.frequency_mhz,
        gps_latitude: dto.network.gps_latitude,
        gps_longitude: dto.network.gps_longitude,
      },
      safety_score: dto.safety_score,
      scan_duration_sec: dto.scan_duration_sec,
      scan_config: dto.scan_config,
      attacks: dto.attacks.map((a) => ({
        attack_type: a.attack_type,
        severity: a.severity,
        confidence: a.confidence,
        detected_at: a.detected_at,
        details: a.details,
      })),
      device_hardware_id: dto.device_hardware_id,
      firmware_version: dto.firmware_version,
      started_at: dto.started_at,
      completed_at: dto.completed_at,
    };

    const expected = createHash('sha256')
      .update(JSON.stringify(canonical), 'utf8')
      .digest('hex');

    return expected === dto.payload_hash;
  }
}




