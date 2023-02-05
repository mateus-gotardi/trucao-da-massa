import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGatewayModule } from '../websocket/gameGateway.module';

@Module({
  imports: [GameGatewayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
