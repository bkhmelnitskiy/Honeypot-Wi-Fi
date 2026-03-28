import { Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    // TODO: implement registration
    return { user_id: '', email: dto.email, display_name: dto.display_name, created_at: new Date() };
  }

  async login(dto: LoginDto) {
    // TODO: implement login
    return { user_id: '', access_token: '', refresh_token: '', expires_in: 3600, refresh_expires_in: 2592000, display_name: '' };
  }

  async refresh(refreshToken: string) {
    // TODO: implement token refresh
    return { access_token: '', refresh_token: '', expires_in: 3600, refresh_expires_in: 2592000 };
  }

  async logout(refreshToken: string) {
    // TODO: implement logout (revoke refresh token)
  }
}
