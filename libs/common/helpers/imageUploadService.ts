import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomStrings } from './randomString';
import { Buffer } from 'buffer';

@Injectable()
export class ImageUploadService {
  private bucketName: string;
  private imageUrl: string;
  private folder: string;

  constructor(
    @Inject('S3_CLIENT') private s3Client: S3Client,
    private configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');
    this.imageUrl = this.configService.get<string>('AWS_IMAGE_URL');
    this.folder = this.configService.get<string>('AWS_S3_FOLDER');
  }

  async uploadImages(files: Array<Express.Multer.File>): Promise<string[]> {
    const uploadPromises: Promise<string>[] = [];

    for (const file of files) {
      /* Generating a random string of characters to be prefixed to the name of the file. */
      const fileName = randomStrings(file.originalname);

      /* Creating an object that will be used to upload the image to the S3 bucket. */
      const uploadPromise = (async () => {
        try {
          const url = `${this.imageUrl}${this.folder}${fileName}`;
          const response = await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: String(this.folder + fileName),
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
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const fileName = randomStrings(file.originalname);

    try {
      const url = `${this.imageUrl}${this.folder}${fileName}`;
      const response = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: String(this.folder + fileName),
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
  }

  /* Deleting the image from the S3 bucket. */
  async deleteImage(imageToDelete: string): Promise<string> {
    const key = `${this.folder}${imageToDelete.split('/')[4]}`;

    try {
      const response = await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      if (response.$metadata.httpStatusCode === 204) {
        return 'Image deleted';
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async decodeBase64Images(
    base64Images: string[],
  ): Promise<Array<Express.Multer.File>> {
    return base64Images.map((base64String, index) => {
      const matches = base64String.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new BadRequestException('Invalid base64 image string');
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      return {
        fieldname: `file${index}`,
        originalname: `image${index}.${mimeType.split('/')[1]}`,
        encoding: '7bit',
        mimetype: mimeType,
        buffer,
        size: buffer.length,
      } as Express.Multer.File;
    });
  }
}
