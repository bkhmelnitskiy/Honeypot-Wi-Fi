import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { SyncStatusQueryDto } from './dto/sync-status-query.dto';
import { BatchUploadDto } from './dto/batch-upload.dto';
import { Scan } from 'src/scans/entities/scan.entity';
import { Attack } from 'src/scans/entities/attack.entity';
import { Network } from 'src/networks/entities/network.entity';
import { ScanUploadDto } from './dto/scan-upload.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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

  async getStatus(userId: string, query: SyncStatusQueryDto) {
    // TODO: implement incremental sync - return updated networks since last sync
    return {
      updated_networks: [],
      global_stats: {},
      has_more: false,
      next_since: null,
      server_time: new Date().toISOString(),
    };
  }

  async batchUpload(userId: string, dto: BatchUploadDto) {
    // TODO: implement batch scan upload with per-scan validation
    return {
      results: dto.scans.map((scan) => ({
        client_scan_id: scan.client_scan_id,
        status: 'CREATED',
        server_scan_id: '',
        error: null,
      })),
    };
  }


  async uploadScan(userId: string, dto: ScanUploadDto) {

    if (!this.checkHash(dto)) {
      throw new BadRequestException('Invalid payload hash');
    }

    if (dto.payload_hash) {
      const isDuplicate = await this.scansRepository.findOne({ where: { payload_hash: dto.payload_hash } });
      if (isDuplicate) {
        throw new ConflictException('Duplicate scan upload');
      }
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




