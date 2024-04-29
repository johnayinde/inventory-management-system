import { BadRequestException } from '@nestjs/common';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './aws-lib';
import { randomStrings } from './randomString';

export const uploadImages = async (
  files: Array<Express.Multer.File>,
  folder: string,
): Promise<string[]> => {
  const uploadPromises: Promise<string>[] = [];

  for (const file of files) {
    /* Generating a random string of characters to be prefixed to the name of the file. */
    const fileName = randomStrings(file.originalname);

    /* Creating an object that will be used to upload the image to the S3 bucket. */
    const uploadPromise = (async () => {
      try {
        const url = `${process.env.AWS_IMAGE_URL}${folder}${fileName}`;
        const response = await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: String(folder + fileName),
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentDisposition: 'inline',
            ACL: 'public-read',
          }),
        );

        if (response.$metadata.httpStatusCode === 200) {
          return url;
        } else {
          throw new BadRequestException('Internal Server Error');
        }
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    })();

    uploadPromises.push(uploadPromise);
  }

  try {
    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    throw new BadRequestException(error.message);
  }
};

/* Deleting the image from the S3 bucket. */
export const deleteImage = async (key: string): Promise<string> => {
  try {
    const response = await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    );
    if (response.$metadata.httpStatusCode === 204) {
      return 'Image deleted';
    }
  } catch (error) {
    throw new BadRequestException(error.message);
  }
};
