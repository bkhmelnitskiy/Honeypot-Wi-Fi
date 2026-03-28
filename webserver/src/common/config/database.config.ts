import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'honeypot'),
    password: configService.get<string>('DB_PASSWORD', 'honeypot'),
    database: configService.get<string>('DB_DATABASE', 'honeypot'),
    autoLoadEntities: true,
    synchronize: configService.get<string>('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
};
