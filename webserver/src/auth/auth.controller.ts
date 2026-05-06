import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthCookieService, REFRESH_TOKEN_COOKIE } from './auth-cookie.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  RegisterResponseDto,
  LoginResponseDto,
  TokensResponseDto,
} from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authenticate and receive JWT tokens. Tokens are also set as httpOnly cookies for browser clients.',
  })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(dto);
    this.applyTokenCookies(res, result);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exchange a refresh token for a new token pair. Reads token from httpOnly cookie or request body.',
  })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokensResponseDto> {
    const token = this.extractRefreshToken(req, dto);
    const tokens = await this.authService.refresh(token);
    this.applyTokenCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh token and clear auth cookies' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = this.extractRefreshToken(req, dto);
    await this.authService.logout(token);
    this.cookieService.clearAuthCookies(res);
  }

  private applyTokenCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number },
  ): void {
    this.cookieService.setAccessCookie(res, tokens.access_token, tokens.expires_in);
    this.cookieService.setRefreshCookie(
      res,
      tokens.refresh_token,
      tokens.refresh_expires_in,
    );
  }

  private extractRefreshToken(req: Request, dto: RefreshDto): string {
    const token =
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE] ??
      dto.refresh_token;
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token;
  }
}
