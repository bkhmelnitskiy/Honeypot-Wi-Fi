import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatsService } from './stats.service';
import { QueryAttacksDto } from './dto/query-attacks.dto';
import { GlobalStatsResponseDto, AttackStatsResponseDto } from './dto/stats-response.dto';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('global')
  @ApiOperation({ summary: 'Global platform statistics (public)' })
  @ApiResponse({ status: 200, type: GlobalStatsResponseDto })
  async getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  @Get('attacks')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Attack trend statistics filtered by type, date, or network' })
  @ApiResponse({ status: 200, type: AttackStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAttackStats(@Query() query: QueryAttacksDto) {
    return this.statsService.getAttackStats(query);
  }
}
