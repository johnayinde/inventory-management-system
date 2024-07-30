import { Module, Global } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'S3_CLIENT',
      useFactory: (configService: ConfigService): S3Client => {
        return new S3Client({
          region: configService.get<string>('AWS_REGION'),
          credentials: {
            accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['S3_CLIENT'],
})
export class S3Module {}
