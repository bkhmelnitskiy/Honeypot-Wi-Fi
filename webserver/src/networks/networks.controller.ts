import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NetworksService } from './networks.service';
import { QueryNetworksDto } from './dto/query-networks.dto';
import { NetworkListResponseDto, NetworkDetailResponseDto } from './dto/network-response.dto';

@ApiTags('Networks')
@ApiBearerAuth('access-token')
@Controller('networks')
@UseGuards(JwtAuthGuard)
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get()
  @ApiOperation({ summary: 'List all observed Wi-Fi networks (cursor-paginated)' })
  @ApiResponse({ status: 200, type: NetworkListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: QueryNetworksDto) {
    return this.networksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed statistics for a single network by UUID' })
  @ApiParam({ name: 'id', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, type: NetworkDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Network not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.networksService.findOne(id);
  }
}
