import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async getProfile(userId: string) {
    // TODO: implement with total_scans and total_networks_scanned
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    // TODO: implement profile update with password change
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async deleteAccount(userId: string, password: string) {
    // TODO: implement account deletion with password verification
  }
}
