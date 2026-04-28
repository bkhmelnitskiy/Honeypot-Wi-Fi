import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppClsStore } from './cls-store';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, ClsService],
      useFactory: (config: ConfigService, cls: ClsService<AppClsStore>) => {
        const isDev = config.get<string>('NODE_ENV') === 'development';
        const level = config.get<string>('LOG_LEVEL', isDev ? 'debug' : 'info');

        return {
          pinoHttp: {
            level,
            genReqId: (req: IncomingMessage) => {
              if (cls.isActive()) {
                const existing = cls.get('requestId');
                if (existing) return existing;
              }
              const headerId = req.headers['x-request-id'];
              const id =
                (Array.isArray(headerId) ? headerId[0] : headerId) ??
                randomUUID();
              if (cls.isActive()) cls.set('requestId', id);
              return id;
            },
            customProps: (): Record<string, unknown> => ({
              requestId: cls.isActive() ? cls.get('requestId') : undefined,
              userId: cls.isActive() ? cls.get('userId') : undefined,
            }),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.password_hash',
                'req.body.token',
                'req.body.refresh_token',
              ],
              remove: true,
            },
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            serializers: {
              req: (
                req: IncomingMessage & { url?: string; method?: string },
              ) => ({
                method: req.method,
                url: req.url,
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
            },
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    singleLine: false,
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
