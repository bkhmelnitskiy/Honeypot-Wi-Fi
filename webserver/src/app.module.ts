import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { databaseConfig } from './common/config/database.config';
import { LoggingModule } from './common/logging/logging.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScansModule } from './scans/scans.module';
import { NetworksModule } from './networks/networks.module';
import { StatsModule } from './stats/stats.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => {
          const headerId = req.headers['x-request-id'];
          return (
            (Array.isArray(headerId) ? headerId[0] : headerId) ?? randomUUID()
          );
        },
        setup: (cls) => {
          cls.set('requestId', cls.getId());
        },
      },
    }),
    LoggingModule,
    MetricsModule,
    TypeOrmModule.forRootAsync(databaseConfig),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    AuthModule,
    UsersModule,
    ScansModule,
    NetworksModule,
    StatsModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
