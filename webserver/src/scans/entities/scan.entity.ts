import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Network } from '../../networks/entities/network.entity';
import { Attack } from './attack.entity';

@Entity('scans')
export class Scan {
  @PrimaryGeneratedColumn('uuid')
  server_scan_id: string;

  @Column({ unique: true })
  client_scan_id: string;

  @Column({ type: 'float' })
  safety_score: number;

  @Column()
  scan_duration_sec: number;

  @Column({ type: 'jsonb', nullable: true })
  scan_config: Record<string, any>;

  @Column()
  device_hardware_id: string;

  @Column()
  firmware_version: string;

  @Column()
  started_at: Date;

  @Column()
  completed_at: Date;

  @Column({ nullable: true })
  payload_hash: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.scans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @ManyToOne(() => Network, (network) => network.scans)
  @JoinColumn({ name: 'network_id' })
  network: Network;

  @Column()
  network_id: string;

  @OneToMany(() => Attack, (attack) => attack.scan, { cascade: true })
  attacks: Attack[];
}
