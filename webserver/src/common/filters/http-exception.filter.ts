import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === HttpStatus.UNPROCESSABLE_ENTITY && Array.isArray((exceptionResponse as any).message)) {
        const messages: string[] = (exceptionResponse as any).message;
        const details = messages.map((msg) => {
          const field = msg.split(' ')[0];
          return { field, reason: msg };
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
              error:
                (exceptionResponse as any).error ||
                exception.name.replace('Exception', '').toUpperCase(),
              message:
                (exceptionResponse as any).message || exception.message,
              details: (exceptionResponse as any).details || [],
            };

      response.status(status).json(error);
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      );

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: [],
      });
    }
  }
}
