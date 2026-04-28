import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {createHash} from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterResponseDto, LoginResponseDto, TokensResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService    
  ){}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user: User;
    try {
      user = this.usersRepository.create({
        email: dto.email,
        password_hash: passwordHash,
        display_name: dto.display_name,
      });
      await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    return {
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: dto.email })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    } 
    
    const tokens = await this.generateJwtTokens(user);
    return {
      ...tokens,
      user_id: user.user_id,
      display_name: user.display_name,
    };
  }

  async refresh(refreshToken: string): Promise<TokensResponseDto> {
   
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const tokenEntity = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });
    if (!tokenEntity || tokenEntity.revoked || tokenEntity.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    
    const user = tokenEntity.user;
    const tokens = await this.generateJwtTokens(user);

    tokenEntity.revoked = true; 
    await this.refreshTokensRepository.save(tokenEntity);

    return tokens;
  }

  async logout(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const tokenEntity = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });
    if (!tokenEntity || tokenEntity.revoked || tokenEntity.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    tokenEntity.revoked = true;
    await this.refreshTokensRepository.save(tokenEntity);

    return;
  }


  private async generateJwtTokens(user: User): Promise<TokensResponseDto> {

      let refreshTime:number = Number(this.configService.get('JWT_REFRESH_EXPIRATION')) || 2592000; // default 30 days
      let accessTime:number = Number(this.configService.get('JWT_ACCESS_EXPIRATION')) || 3600; // default 1 hour

      const payload = { sub: user.user_id, email: user.email };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTime
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: refreshTime
      })


      const refreshTokenEntity = this.refreshTokensRepository.create({
        token_hash: createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() + refreshTime  * 1000),
        user_id: user.user_id,
      });
      await this.refreshTokensRepository.save(refreshTokenEntity);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: accessTime,
        refresh_expires_in: refreshTime
      }
  }
}
