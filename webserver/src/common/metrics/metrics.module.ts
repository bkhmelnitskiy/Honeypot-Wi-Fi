import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { ApiKeyGuard } from './api-key.guard';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    ApiKeyGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
