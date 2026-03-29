import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

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
  }
}
