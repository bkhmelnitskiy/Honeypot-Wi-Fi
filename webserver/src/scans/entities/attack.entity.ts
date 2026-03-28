import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Scan } from './scan.entity';

export enum AttackType {
  ARP_SPOOFING = 'ARP_SPOOFING',
  DNS_SPOOFING = 'DNS_SPOOFING',
  EVIL_TWIN = 'EVIL_TWIN',
  DEAUTHENTICATION = 'DEAUTHENTICATION',
  NETWORK_SCAN = 'NETWORK_SCAN',
  MALWARE_PROPAGATION = 'MALWARE_PROPAGATION',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('attacks')
export class Attack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AttackType })
  attack_type: AttackType;

  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'float' })
  confidence: number;

  @Column()
  detected_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @ManyToOne(() => Scan, (scan) => scan.attacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scan_id' })
  scan: Scan;

  @Column()
  scan_id: string;
}
