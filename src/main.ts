import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { json, urlencoded } from 'express';
import { useContainer } from 'class-validator';
import { logger } from 'logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Handle favicon.ico requests to prevent 404 errors in logs
  app.use('/favicon.ico', (req, res) => res.status(204).end());

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

  const port = configService.get('PORT') || configService.get('APP_PORT') || 5000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
