import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Scan } from 'src/scans/entities/scan.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async findById(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { user_id: userId } });
  }

  async getProfile(userId: string) {
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

  async updateProfile(userId: string, dto: UpdateUserDto) {

    let user = await this.usersRepository.findOne({ where: { user_id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (dto.display_name) {
      user.display_name = dto.display_name;
      user.updated_at = new Date(); 
      user = await this.usersRepository.save(user);
    }

    if(dto.new_password){
      if(!dto.current_password){
        throw new BadRequestException('Current password is required to set a new password');
      }

      const isMatch = bcrypt.compareSync(dto.current_password, user.password_hash);
      if (!isMatch) {
        throw new BadRequestException('Invalid password');
      } 
      user.password_hash = bcrypt.hashSync(dto.new_password, 10); 
      user.updated_at = new Date();
      user = await this.usersRepository.save(user);
    }

    return {
      user_id: user.user_id,  
      email: user.email,
      display_name: user.display_name,
      updated_at: user.updated_at.toISOString()
    };
  }

  async deleteAccount(userId: string, password: string) {

    let user = await this.usersRepository.findOne({ where: { user_id: userId } });    

    if (!user){
      throw new BadRequestException('User not found');
    }
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Invalid password');
    }

    await this.refreshTokensRepository.delete({ user_id: userId });
    await this.usersRepository.remove(user);
    return;
  }

  private getUserScansCount(userId: string){
    return this.scansRepository.count({ where: { user_id: userId } });
  }

  private getUserNetworksCount(userId: string){
    return this.scansRepository.createQueryBuilder('scan')
      .where('scan.user_id = :userId', { userId })
      .select('COUNT(DISTINCT scan.network_id)', 'count')
      .getRawOne()
      .then(result => parseInt(result.count, 10));
  }

}
