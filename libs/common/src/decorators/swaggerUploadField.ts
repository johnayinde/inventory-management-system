import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiBody, ApiBodyOptions, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { imageFileFilter, editFileName } from './fileTypeFilter';

export function ApiFile(
  fileConfig: {
    fieldName: string;
    limit?: number;
    destination: string;
  },
  body?: ApiBodyOptions,
) {
  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(fileConfig.fieldName, fileConfig.limit, {
        fileFilter: imageFileFilter,
        storage: diskStorage({
          destination: `./images/${fileConfig.destination}`,
          filename: editFileName,
        }),
      }),
    ),
    ApiConsumes(
      fileConfig.fieldName ? 'multipart/form-data' : 'application/json',
    ),
    ApiBody(body),
  );
}
