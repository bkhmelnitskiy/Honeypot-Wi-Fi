import { IsOptional, IsString, IsUUID, IsIn, IsISO8601 } from 'class-validator';

export class QueryAttacksDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'ARP_SPOOFING',
    'DNS_SPOOFING',
    'EVIL_TWIN',
    'DEAUTHENTICATION',
    'NETWORK_SCAN',
    'MALWARE_PROPAGATION',
  ])
  type?: string;

  @IsOptional()
  @IsISO8601()
  since?: string;

  @IsOptional()
  @IsUUID()
  network_id?: string;
}
