import { Module } from '@nestjs/common';
import { GameGateway } from './gameGateway';

@Module({
  imports: [GameGateway],
})
export class GameGatewayModule {}
