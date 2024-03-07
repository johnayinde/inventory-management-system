import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiBody, ApiBodyOptions, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { imageFileFilter, editFileName } from './fileTypeFilter';

export function ApiFile(
  fieldName: string,
  limit?: number,
  body?: ApiBodyOptions,
) {
  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(fieldName, limit, { fileFilter: imageFileFilter }),
    ),
    ApiConsumes(fieldName ? 'multipart/form-data' : 'application/json'),
    ApiBody(body),
  );
}
