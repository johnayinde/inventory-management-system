import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { EXCEPTIONMESSAGE, NOTFOUNDROUTE, UNAUTHORIZED } from '@app/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    let res;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    console.log(typeof exception, exception);

    const response =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof InternalServerErrorException
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
      `TZ:${new Date().toUTCString()}- Status:${httpStatus}- Method: ${null} - Route:${
        responseBody.path
      } - Response ${exception}`,
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
