import { WebSocketGateway, WebSocketServer, SubscribeMessage, WsResponse } from "@nestjs/websockets"

@WebSocketGateway()
export class GameGateway {
    @WebSocketServer() server;
    players = []

    @SubscribeMessage('join')
    joinTable(client, data): WsResponse<any> {
        this.players.push(client);
        return { event: 'players', data: this.players.length}
    }

    @SubscribeMessage('disconnect')
    disconnectTable(client, data): void {
        this.players = this.players.filter(client => client !== this)
        this.server.emit('players', this.players.length)
    }
}