import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { StatsService } from './stats.service.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('global')
  async getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  @Get('attacks')
  @UseGuards(JwtAuthGuard)
  async getAttackStats(
    @Query('type') type?: string,
    @Query('since') since?: string,
    @Query('network_id') networkId?: string,
  ) {
    return this.statsService.getAttackStats(type, since, networkId);
  }
}
