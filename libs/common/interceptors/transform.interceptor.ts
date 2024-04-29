import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS } from '../constants/response.messages';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

export interface Res<T> {
  success: boolean;
  timestamp: string;
  server_res: string;
  statusCode: number;
  error: string;
  path: string;
  message: Array<string> | string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Res<T>> {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<Res<T>> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        timestamp: new Date().toISOString(),
        server_res: SUCCESS,
        statusCode: response.statusCode,
        error: '',
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
        message: typeof data === 'string' ? [data] : ['Data Fetched'],
        data: typeof data !== 'string' ? data : [],
      })),
    );
  }
}
