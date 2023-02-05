import { NestFactory } from '@nestjs/core';
import { AppModule } from './http/controller/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
  });
  await app.listen(3333);
}
bootstrap();
