import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Scan } from '../../scans/entities/scan.entity';

@Entity('networks')
export class Network {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ssid: string;

  @Column({ unique: true })
  bssid: string;

  @Column({ nullable: true })
  channel: number;

  @Column({ default: 'OPEN' })
  encryption_type: string;

  @Column({ type: 'int', nullable: true })
  frequency_mhz: number;

  @Column({ type: 'float', nullable: true })
  gps_latitude: number;

  @Column({ type: 'float', nullable: true })
  gps_longitude: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Scan, (scan) => scan.network)
  scans: Scan[];
}
