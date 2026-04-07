export interface ProfileResponseDto {
  user_id: string;
  email: string;
  display_name: string;
  created_at: Date;
  total_scans: number;
  total_networks_scanned: number;
}

export interface UpdateProfileResponseDto {
  user_id: string;
  email: string;
  display_name: string;
  updated_at: string;
}
