import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { json, urlencoded } from 'express';
import { useContainer } from 'class-validator';
import { logger } from 'logger/winston.logger';
import { WinstonModule } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors();
  const configService = app.get(ConfigService);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe());

  const options = new DocumentBuilder()
    .setTitle('Invio')
    .setDescription('Invio doumentation')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(configService.get('APP_PORT'));
}
bootstrap();
