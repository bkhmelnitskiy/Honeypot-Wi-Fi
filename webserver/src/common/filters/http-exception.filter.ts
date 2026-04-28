import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { MetricsService } from '../metrics/metrics.service';
import { AppClsStore } from '../logging/cls-store';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService<AppClsStore>,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, response);
      return;
    }

    this.handleUnknownException(exception, response);
  }

  private handleHttpException(
    exception: HttpException,
    response: Response,
  ): void {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const errorType = exception.name.replace('Exception', '').toUpperCase();

    if (
      status === Number(HttpStatus.UNPROCESSABLE_ENTITY) &&
      Array.isArray((exceptionResponse as { message?: unknown }).message)
    ) {
      const messages = (exceptionResponse as { message: string[] }).message;
      const details = messages.map((msg) => ({
        field: msg.split(' ')[0],
        reason: msg,
      }));

      this.logger.warn(
        this.contextFields({ statusCode: status, errorType, details }),
        'Validation failed',
      );
      this.metrics.appErrorsTotal.inc({
        type: 'VALIDATION_FAILED',
        status_code: String(status),
      });

      response.status(status).json({
        error: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details,
      });
      return;
    }

    const error =
      typeof exceptionResponse === 'string'
        ? { error: 'ERROR', message: exceptionResponse, details: [] }
        : {
            error: (exceptionResponse as { error?: string }).error ?? errorType,
            message:
              (exceptionResponse as { message?: string }).message ??
              exception.message,
            details:
              (exceptionResponse as { details?: unknown[] }).details ?? [],
          };

    this.logger.warn(
      this.contextFields({ statusCode: status, errorType: error.error }),
      error.message,
    );
    this.metrics.appErrorsTotal.inc({
      type: error.error,
      status_code: String(status),
    });

    response.status(status).json(error);
  }

  private handleUnknownException(exception: unknown, response: Response): void {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const err =
      exception instanceof Error ? exception : new Error(String(exception));

    this.logger.error(
      this.contextFields({ statusCode: status, err }),
      'Unhandled exception',
    );
    this.metrics.appErrorsTotal.inc({
      type: 'INTERNAL_SERVER_ERROR',
      status_code: String(status),
    });

    response.status(status).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: [],
    });
  }

  private contextFields(
    extra: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!this.cls.isActive()) return extra;
    return {
      requestId: this.cls.get('requestId'),
      userId: this.cls.get('userId'),
      ...extra,
    };
  }
}
