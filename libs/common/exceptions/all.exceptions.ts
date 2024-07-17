import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { EXCEPTIONMESSAGE, NOTFOUNDROUTE, UNAUTHORIZED } from '@app/common';
import { CustomLogger } from '../../../logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger;
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {
    this.logger =
      process.env.NODE_ENV === 'production'
        ? new CustomLogger(AllExceptionsFilter.name)
        : new Logger(AllExceptionsFilter.name);
  }

  async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    let res;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const response =
      exception instanceof HttpException
        ? exception.getResponse()
        : EXCEPTIONMESSAGE;

    const message =
      httpStatus === 404
        ? NOTFOUNDROUTE
        : httpStatus === 401
        ? UNAUTHORIZED
        : EXCEPTIONMESSAGE;

    typeof response === 'string' ? (res = response) : (res = { ...response });

    let responseBody = {
      success: false,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      server_res: message,
      data: [],
    };

    typeof response === 'string'
      ? (responseBody['message'] = [response])
      : typeof response !== 'string'
      ? (responseBody = { ...responseBody, ...res })
      : '';

    this.logger.error(
      ` - Response ${exception.stack},
        - Status:${httpStatus}
        - Time:${new Date().toUTCString()}`,
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
