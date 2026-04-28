import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { TypeOrmSlowQueryLogger } from '../database/typeorm-slow-query.logger';
import { MetricsService } from '../metrics/metrics.service';
import { AppClsStore } from '../logging/cls-store';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService, PinoLogger, ClsService, MetricsService],
  useFactory: (
    configService: ConfigService,
    pinoLogger: PinoLogger,
    cls: ClsService<AppClsStore>,
    metrics: MetricsService,
  ) => {
    const slowThresholdMs = configService.get<number>('DB_SLOW_QUERY_MS', 500);

    return {
      type: 'postgres' as const,
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'honeypot'),
      password: configService.get<string>('DB_PASSWORD', 'honeypot'),
      database: configService.get<string>('DB_DATABASE', 'honeypot'),
      autoLoadEntities: true,
      synchronize: configService.get<string>('NODE_ENV') === 'development',
      maxQueryExecutionTime: slowThresholdMs,
      logger: new TypeOrmSlowQueryLogger(
        slowThresholdMs,
        pinoLogger,
        cls,
        metrics,
      ),
      logging: ['error', 'warn'],
    };
  },
};
