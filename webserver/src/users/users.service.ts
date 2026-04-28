import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Scan } from '../scans/entities/scan.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import { ProfileResponseDto, UpdateProfileResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const totalScans = await this.getUserScansCount(userId);    
    const totalNetworks = await this.getUserNetworksCount(userId);
    
    return {
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
      total_scans: totalScans,
      total_networks_scanned: totalNetworks,  
    }
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UpdateProfileResponseDto> {

    let user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.user_id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let hasChanges = false;

    if (dto.display_name) {
      user.display_name = dto.display_name;
      hasChanges = true;
    }

    if (dto.new_password) {
      if (!dto.current_password) {
        throw new BadRequestException('Current password is required to set a new password');
      }

      const isMatch = await bcrypt.compare(dto.current_password, user.password_hash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid password');
      }
      user.password_hash = await bcrypt.hash(dto.new_password, 10);
      hasChanges = true;
    }

    if (hasChanges) {
      user = await this.usersRepository.save(user);
    }

    return {
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      updated_at: user.updated_at.toISOString(),
    };
  }

  async deleteAccount(userId: string, password: string) {

    let user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.user_id = :userId', { userId })
      .getOne();

    if (!user){
      throw new BadRequestException('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(RefreshToken, { user_id: userId });
      await manager.remove(user);
    });
  }

  private getUserScansCount(userId: string){
    return this.scansRepository.count({ where: { user_id: userId } });
  }

  private getUserNetworksCount(userId: string){
    return this.scansRepository.createQueryBuilder('scan')
      .where('scan.user_id = :userId', { userId })
      .select('COUNT(DISTINCT scan.network_id)', 'count')
      .getRawOne()
      .then(result => result ? parseInt(result.count, 10) : 0);
  }

}
