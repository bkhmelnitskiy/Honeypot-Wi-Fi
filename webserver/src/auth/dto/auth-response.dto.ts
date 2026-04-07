export interface RegisterResponseDto {
  user_id: string;
  email: string;
  display_name: string;
  created_at: Date;
}

export interface LoginResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  user_id: string;
  display_name: string;
}

export interface TokensResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}
