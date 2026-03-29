import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NetworksService } from './networks.service';
import { QueryNetworksDto } from './dto/query-networks.dto';

@Controller('networks')
@UseGuards(JwtAuthGuard)
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get()
  async findAll(@Query() query: QueryNetworksDto) {
    return this.networksService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.networksService.findOne(id);
  }
}
