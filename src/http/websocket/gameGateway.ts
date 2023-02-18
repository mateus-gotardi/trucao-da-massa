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
import { TrucoCard } from 'src/application/create-deck';

import { TrucoTable } from 'src/application/create-game';
import { TrucoPlayer } from 'src/application/create-player';

let rooms = {};

const gameExists = (roomId: string) => {
  if (rooms[roomId]) {
    return true;
  } else {
    return false;
  }
}
const getNextPlayer = (playerId: string, roomId: string) => {
  if (rooms[roomId].team1[0].playerId === playerId) {
    return rooms[roomId].team2[0].playerId;
  } else if (rooms[roomId].team2[0].playerId === playerId) {
    return rooms[roomId].team1[1].playerId;
  } else if (rooms[roomId].team1[1].playerId === playerId) {
    return rooms[roomId].team2[1].playerId;
  } else if (rooms[roomId].team2[1].playerId === playerId) {
    return rooms[roomId].team1[0].playerId;
  }
}

const getPartner = (playerId: string, roomId: string) => {
  if (rooms[roomId].team1[0].playerId === playerId) {
    return rooms[roomId].team1[1].playerId;
  } else if (rooms[roomId].team1[1].playerId === playerId) {
    return rooms[roomId].team1[0].playerId;
  } else if (rooms[roomId].team2[0].playerId === playerId) {
    return rooms[roomId].team2[1].playerId;
  } else if (rooms[roomId].team2[1].playerId === playerId) {
    return rooms[roomId].team2[0].playerId;
  }
}
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
    if (gameExists(body.roomId)) {
      if (!rooms[body.roomId].isPlayerOnTable(body.playerId)) {
        if (rooms[body.roomId]['team' + body.team].length < 2) {
          let player = new TrucoPlayer(body.name, body.playerId);
          rooms[body.roomId].addPlayer(player, body.team);
          let table = rooms[body.roomId].getTable();
          client.join(body.roomId);
          client.join(body.playerId);
          this.updateRoom(body.roomId);
          return { event: 'join', data: { table, player, team: `team${body.team}` } };
        } else {
          return { event: 'error-join', data: 'Time Lotado' };
        }
      } else {
        return { event: 'error-join', data: 'Jogador ja está na mesa' };
      }
    } else {
      return { event: 'error-join', data: 'Sala não existe' };
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
    @ConnectedSocket() client: Socket,
  ) {
    if (!gameExists(body.roomId)) {
      rooms[body.roomId] = new TrucoTable(body.roomId, body.playerId);
      let player = new TrucoPlayer(body.name, body.playerId);
      rooms[body.roomId].addPlayer(player, body.team);
      let table = rooms[body.roomId].getTable();
      client.join(body.roomId);
      client.join(body.playerId);
      return { event: 'join', data: { table, player, team: `team${body.team}` } };
    } else {
      return { event: 'error-create', data: 'Sala já existe' };
    }
  }

  @SubscribeMessage('exit')
  onExit(
    @MessageBody()
    body: {
      roomId: string;
      name: string;
      team: number;
      playerId: string;
    }
  ) {
    if (gameExists(body.roomId)) {
      rooms[body.roomId].removePlayer(body.playerId);
      this.updateRoom(body.roomId);
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
        gameExists(body.roomId) && rooms[body.roomId].isPlayerOnTable(body.playerId)
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
        this.updateRoom(body.roomId);
      } else {
        this.server.to(client.id).emit('setupconnection', { status });
      }
    }
  }

  @SubscribeMessage('getrooms')
  onGetRooms() {
    return { event: 'getrooms', data: Object.keys(rooms) };
  }

  @SubscribeMessage('changeteam')
  onChangeTeam(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    if (gameExists(body.roomId)) {
      rooms[body.roomId].changeTeam(body.playerId);
      this.updateRoom(body.roomId);
    }

  }

  @SubscribeMessage('setready')
  onSetReady(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    if (gameExists(body.roomId)) {
      rooms[body.roomId].setReady(body.playerId);
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('startgame')
  onStartGame(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    if (
      gameExists(body.roomId) &&
      !rooms[body.roomId].isGameStarted &&
      rooms[body.roomId].isReadyToStart() &&
      rooms[body.roomId].createdBy === body.playerId
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
    if (gameExists(body.roomId) && rooms[body.roomId].turn === body.playerId &&
      rooms[body.roomId].currentTruco !== body.playerId) {
      let playerToAccept = getNextPlayer(body.playerId, body.roomId);
      switch (rooms[body.roomId].getTeam(body.playerId)) {
        case 'team1':
          this.server.to(body.roomId).emit('acceptTruco', { team: 'team2', player: playerToAccept, asker: body.playerId });
          break;
        case 'team2':
          this.server.to(body.roomId).emit('acceptTruco', { team: 'team1', player: playerToAccept, asker: body.playerId });
          break;
      }
    }
  }

  @SubscribeMessage('responsetruco')
  async onResponseTruco(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
      accepted: boolean;
      asker: string;
    },
  ) {
    if (gameExists(body.roomId)) {
      await rooms[body.roomId].truco(body.asker, body.accepted);
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('askmoretruco')
  async onAskMoreTruco(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
      previousAsker: string;
    },
  ) {
    if (gameExists(body.roomId)) {
      await rooms[body.roomId].truco(body.previousAsker, true);
      this.updateRoom(body.roomId);
      switch (rooms[body.roomId].getTeam(body.playerId)) {
        case 'team1':
          this.server.to(body.roomId).emit('acceptTruco', { team: 'team2', player: body.previousAsker, asker: body.playerId });
          break;
        case 'team2':
          this.server.to(body.roomId).emit('acceptTruco', { team: 'team1', player: body.previousAsker, asker: body.playerId });
          break;
      }
    }
  }

  @SubscribeMessage('helpfriend')
  onHelpFriend(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
      accept: "yes" | "no" | "bet";
    },
  ) {
    this.server.to(getPartner(body.playerId, body.roomId)).emit('helpfriend', { accept: body.accept });
  }

  @SubscribeMessage('playcard')
  async onPlayCard(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
      card: TrucoCard;
    },
  ) {
    if (gameExists(body.roomId) && !rooms[body.roomId].waiting) {
      if (rooms[body.roomId].playedCards.length !== rooms[body.roomId].numberOfPlayers()) {
        await rooms[body.roomId].playCard(body.card, body.playerId);
        this.updateRoom(body.roomId);
      }
      if (rooms[body.roomId].playedCards.length === rooms[body.roomId].numberOfPlayers()) {
        rooms[body.roomId].waiting = true;
        setTimeout(async () => {
          await rooms[body.roomId].endPartial();
          this.updateRoom(body.roomId);
          rooms[body.roomId].waiting = false;
        }, 3000);
      }
    }
  }

}
