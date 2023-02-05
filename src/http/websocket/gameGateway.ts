import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  WsResponse,
  MessageBody,
} from '@nestjs/websockets';

@WebSocketGateway()
export class GameGateway {
  @SubscribeMessage('join')
  onNewMessage(@MessageBody() body: any) {
    return { event: 'join', data: 'New player connect' };
  }
}
