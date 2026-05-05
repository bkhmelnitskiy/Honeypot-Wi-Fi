import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookie.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

const fromAuthCookie: JwtFromRequestFunction = (req: Request) => {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromAuthCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { user_id: payload.sub, email: payload.email };
  }
}
