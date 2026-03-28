import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScansService } from './scans.service';
import { QueryScansDto } from './dto/query-scans.dto';

@Controller('scans')
@UseGuards(JwtAuthGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { user_id: string },
    @Query() query: QueryScansDto,
  ) {
    return this.scansService.findAll(user.user_id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: { user_id: string },
    @Param('id') id: string,
  ) {
    return this.scansService.findOne(user.user_id, id);
  }
}
