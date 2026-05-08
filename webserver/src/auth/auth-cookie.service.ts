import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Injectable()
export class AuthCookieService {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  setAccessCookie(res: Response, token: string, maxAgeSeconds: number): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, this.buildOptions(maxAgeSeconds));
  }

  setRefreshCookie(res: Response, token: string, maxAgeSeconds: number): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.buildOptions(maxAgeSeconds),
      path: REFRESH_COOKIE_PATH,
    });
  }

  clearAuthCookies(res: Response): void {
    const base = this.buildOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, base);
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...base,
      path: REFRESH_COOKIE_PATH,
    });
  }

  private buildOptions(maxAgeSeconds?: number): CookieOptions {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/',
    };
    if (maxAgeSeconds !== undefined) {
      options.maxAge = maxAgeSeconds * 1000;
    }
    return options;
  }
}
