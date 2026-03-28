import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Scan } from 'src/scans/entities/scan.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Scan, RefreshToken])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
