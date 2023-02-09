import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { TrucoTable } from 'src/application/create-game';
import { TrucoPlayer } from 'src/application/create-player';

let rooms = {};
@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    console.log('Client connected:', client.id);
  }
  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  broadcastEvent(event: string, data: any) {
    this.server.emit(event, data);
  }

  updateRoom(roomId: string) {
    this.server.to(roomId).emit('update', rooms[roomId].getTable());
  }

  @SubscribeMessage('join')
  onNewMessage(
    @MessageBody()
    body: {
      roomId: string;
      name: string;
      team: number;
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (rooms[body.roomId]) {
      if (!rooms[body.roomId].isPlayerOnTable(body.playerId)) {
        let player = new TrucoPlayer(body.name, body.playerId);
        rooms[body.roomId].addPlayer(player, body.team);
        let table = rooms[body.roomId].getTable();
        client.join(body.roomId);
        this.updateRoom(body.roomId);
        return { event: 'join', data: { table, player } };
      } else {
        return { event: 'error-join', data: 'player already on table' };
      }
    } else {
      return { event: 'error-join', data: 'room does not exist' };
    }
  }

  @SubscribeMessage('create')
  onCreate(
    @MessageBody()
    body: {
      roomId: string;
      name: string;
      team: number;
      playerId: string;
    },
  ) {
    if (!rooms[body.roomId]) {
      rooms[body.roomId] = new TrucoTable(body.roomId);
      let player = new TrucoPlayer(body.name, body.playerId);
      rooms[body.roomId].addPlayer(player, body.team);
      let table = rooms[body.roomId].getTable();
      return { event: 'join', data: { table, player } };
    } else {
      return { event: 'error-create', data: 'room already exists' };
    }
  }

  @SubscribeMessage('setupconnection')
  onSetupConnection(
    @MessageBody()
    body: {
      roomId: string;
      name: string;
      team: number;
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (body.roomId) {
      let status =
        rooms[body.roomId] && rooms[body.roomId].isPlayerOnTable(body.playerId)
          ? true
          : false;
      if (status) {
        let room = rooms[body.roomId];
        let table = room.getTable();
        let player = room.getPlayer(body.playerId);
        client.join(body.roomId);
        this.server
          .to(client.id)
          .emit('setupconnection', { status, table, player });
      } else {
        this.server.to(client.id).emit('setupconnection', { status });
      }
    }
  }

  @SubscribeMessage('getrooms')
  onGetRooms() {
    return { event: 'getrooms', data: rooms };
  }

  @SubscribeMessage('changeteam')
  onChangeTeam(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    rooms[body.roomId].changeTeam(body.playerId);
    this.updateRoom(body.roomId);
  }

  @SubscribeMessage('startgame')
  onStartGame(
    @MessageBody()
    body: {
      roomId: string;
    },
  ) {
    if (
      !rooms[body.roomId].isGameStarted &&
      rooms[body.roomId].isReadyToStart()
    ) {
      rooms[body.roomId].startGame();
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('asktruco')
  onAskTruco(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    if (rooms[body.roomId].getTeam(body.playerId) === 'team1') {
      this.server.to(body.roomId).emit('acceptTruco', 'team2');
    } else if (rooms[body.roomId].getTeam(body.playerId) === 'team2') {
      this.server.to(body.roomId).emit('acceptTruco', 'team1');
    }
  }

  @SubscribeMessage('responsetruco')
  onResponseTruco(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
      accepted: boolean;
    },
  ) {
    rooms[body.roomId].truco(body.playerId, body.accepted);
    this.updateRoom(body.roomId);
  }
}
