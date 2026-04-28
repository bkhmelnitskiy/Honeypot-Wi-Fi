import { Logger as TypeOrmLoggerInterface } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { MetricsService } from '../metrics/metrics.service';
import { AppClsStore } from '../logging/cls-store';

const OPERATIONS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
type Operation = (typeof OPERATIONS)[number] | 'OTHER';

export class TypeOrmSlowQueryLogger implements TypeOrmLoggerInterface {
  constructor(
    private readonly slowThresholdMs: number,
    private readonly logger: PinoLogger,
    private readonly cls: ClsService<AppClsStore>,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('TypeOrm');
  }

  logQuery(): void {
    // Skip non-slow queries to reduce log noise; slow ones come via logQuerySlow.
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
  ): void {
    this.logger.error(
      {
        query,
        parameters,
        err: error,
        requestId: this.requestId(),
      },
      'DB query failed',
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    if (time < this.slowThresholdMs) return;

    const operation = this.detectOperation(query);
    this.metrics.dbSlowQueriesTotal.inc({ operation });

    this.logger.warn(
      {
        operation,
        durationMs: time,
        query,
        parameters,
        requestId: this.requestId(),
      },
      'Slow DB query',
    );
  }

  logSchemaBuild(message: string): void {
    this.logger.debug(message);
  }

  logMigration(message: string): void {
    this.logger.info(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    const fn = level === 'log' ? 'info' : level;
    this.logger[fn]({ message }, 'TypeOrm');
  }

  private requestId(): string | undefined {
    return this.cls.isActive() ? this.cls.get('requestId') : undefined;
  }

  private detectOperation(query: string): Operation {
    const head = query.trimStart().slice(0, 6).toUpperCase();
    for (const op of OPERATIONS) {
      if (head.startsWith(op)) return op;
    }
    return 'OTHER';
  }
}
