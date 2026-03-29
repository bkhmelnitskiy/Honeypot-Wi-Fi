import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: { user_id: string }) {
    return this.usersService.getProfile(user.user_id);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { user_id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.user_id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: { user_id: string },
    @Body('password') password: string,
  ) {
    return this.usersService.deleteAccount(user.user_id, password);
  }
}
