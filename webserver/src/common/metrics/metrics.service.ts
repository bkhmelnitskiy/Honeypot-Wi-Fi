import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  readonly dbSlowQueriesTotal = new Counter({
    name: 'db_slow_queries_total',
    help: 'Total number of slow database queries',
    labelNames: ['operation'] as const,
    registers: [this.registry],
  });

  readonly appErrorsTotal = new Counter({
    name: 'app_errors_total',
    help: 'Total number of application errors',
    labelNames: ['type', 'status_code'] as const,
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
