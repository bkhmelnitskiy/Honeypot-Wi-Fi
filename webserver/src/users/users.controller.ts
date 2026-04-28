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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfileResponseDto, UpdateProfileResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: { user_id: string }) {
    return this.usersService.getProfile(user.user_id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update display name or password' })
  @ApiResponse({ status: 200, type: UpdateProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async updateProfile(
    @CurrentUser() user: { user_id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.user_id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete the authenticated user account' })
  @ApiBody({ schema: { type: 'object', properties: { password: { type: 'string', example: 'Str0ng!Pass' } }, required: ['password'] } })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized or wrong password' })
  async deleteAccount(
    @CurrentUser() user: { user_id: string },
    @Body('password') password: string,
  ) {
    return this.usersService.deleteAccount(user.user_id, password);
  }
}
