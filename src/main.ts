import { NestFactory } from '@nestjs/core';
import { AppModule } from './http/controller/app.module';
import { SocketAdapter } from './http/websocket/adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.useWebSocketAdapter(new SocketAdapter(app));
  await app.listen(3333);
}
bootstrap();
