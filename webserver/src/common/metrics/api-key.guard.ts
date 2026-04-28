import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('METRICS_API_KEY');
    if (!expected) {
      throw new UnauthorizedException('Metrics endpoint disabled');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = this.extractKey(request);

    if (provided !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }

  private extractKey(req: Request): string | undefined {
    const headerKey = req.headers['x-api-key'];
    if (typeof headerKey === 'string') return headerKey;

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return undefined;
  }
}
