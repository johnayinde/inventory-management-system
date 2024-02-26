import { UnsupportedMediaTypeException } from '@nestjs/common';
import { Request } from 'express';
import { extname } from 'path';

/**
 * It takes a list of mimetypes and returns a function that takes a file and returns true if the file's mimetype is in the list of mimetypes
 * @param {string[]} mimetypes - string[] - An array of mimetypes that are allowed to be uploaded.
 * @returns A function that takes in a request, file, and callback.
 */
export function fileMimetypeFilter(...mimetypes: string[]) {
  return (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (mimetypes.some((mime) => file.mimetype.includes(mime))) {
      callback(null, true);
    } else {
      callback(
        new UnsupportedMediaTypeException(
          `You can only upload ${mimetypes.join(', ')} files`,
        ),
        false,
      );
    }
  };
}

export const editFileName = (req, file, callback) => {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};

export const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return callback(
      new UnsupportedMediaTypeException(`You can only upload image files`),
      false,
    );
  }
  callback(null, true);
};
