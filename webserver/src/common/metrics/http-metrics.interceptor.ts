import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    if (request.path === '/metrics') {
      return next.handle();
    }

    const method = request.method;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.record(context, method, start),
        error: () => this.record(context, method, start),
      }),
    );
  }

  private record(
    context: ExecutionContext,
    method: string,
    start: bigint,
  ): void {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = this.resolveRoute(request);
    const statusCode = String(response.statusCode);

    this.metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
    this.metrics.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationSec,
    );
  }

  private resolveRoute(req: Request): string {
    const routePath = (req.route as { path?: string } | undefined)?.path;
    if (routePath) {
      const base = (req.baseUrl ?? '').replace(/\/$/, '');
      return `${base}${routePath}`;
    }
    return req.path || 'unknown';
  }
}
