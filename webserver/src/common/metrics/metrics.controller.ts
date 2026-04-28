import { Controller, Get, Header, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { ApiKeyGuard } from './api-key.guard';

@ApiExcludeController()
@Controller('metrics')
@UseGuards(ApiKeyGuard)
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', this.metricsService.getContentType());
    res.send(await this.metricsService.getMetrics());
  }
}
