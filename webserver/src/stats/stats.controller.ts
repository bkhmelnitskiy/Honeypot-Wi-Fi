import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatsService } from './stats.service';
import { QueryAttacksDto } from './dto/query-attacks.dto';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('global')
  async getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  @Get('attacks')
  @UseGuards(JwtAuthGuard)
  async getAttackStats(@Query() query: QueryAttacksDto) {
    return this.statsService.getAttackStats(query);
  }
}