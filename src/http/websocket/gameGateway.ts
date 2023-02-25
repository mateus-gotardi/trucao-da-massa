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

const isBot = (playerId: string, roomId: string) => {
  let player = rooms[roomId].getPlayer(playerId);
  if (player.name === "Bot" &&
    player.name !== player.playerId) {
    return true;
  } else {
    return false;
  }
}

function deleteInactiveRooms(rooms: { [key: string]: { lastUpdate: Date } }) {
  const now = new Date();
  for (const room in rooms) {
    const lastUpdate = rooms[room].lastUpdate;
    const timeDiffInMillis = now.getTime() - lastUpdate.getTime();
    const timeDiffInMinutes = timeDiffInMillis / (1000 * 60);
    if (timeDiffInMinutes > 15) {
      delete rooms[room];
      console.log(`Sala ${room} excluída por inatividade.`);
    }
  }
}

setInterval(() => {
  deleteInactiveRooms(rooms);
}, 10 * 1000 * 60);
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

  async updateRoom(roomId: string) {
    if (rooms[roomId].gameStarted &&
      isBot(rooms[roomId].turn, roomId)) {
      await rooms[roomId].botPlay()
    }
    if (rooms[roomId].elevenHand && rooms[roomId].elevenAccept.length === 0) {
      let team = rooms[roomId].score.team1 === 11 ? 'team1' : 'team2';
      this.server.to(roomId).emit('handofeleven', { team: team });
    }
    rooms[roomId].lastUpdate = new Date();
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
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (gameExists(body.roomId)) {
      if (rooms[body.roomId].createdBy === body.playerId && !rooms[body.roomId].gameStarted) {
        delete rooms[body.roomId];
        this.server.to(body.roomId).emit('closeroom', { status: true, message: `Sala fechada pelo dono ${body.playerId}` });
      } else if (rooms[body.roomId].createdBy === body.playerId && rooms[body.roomId].gameStarted) {
        let newOwner = getNextPlayer(body.playerId, body.roomId);
        console.log(`removing player ${body.playerId} from room ${body.roomId}`)
        client.leave(body.roomId);
        client.leave(body.playerId);
        rooms[body.roomId].removePlayer(body.playerId);
        let count = 0;
        while (isBot(newOwner, body.roomId) && count < 4) {
          console.log(newOwner)
          newOwner = getNextPlayer(newOwner, body.roomId);
          count++;
        }
        if (!isBot(newOwner, body.roomId)) {
          console.log(`new owner ${newOwner} from room ${body.roomId}`)
          rooms[body.roomId].createdBy = newOwner;
        } else {
          console.log('deleting room '+ body.roomId)
          delete rooms[body.roomId];
        }
      } else {
        console.log(`removing player ${body.playerId} from room ${body.roomId}`)
        rooms[body.roomId].removePlayer(body.playerId);
        client.leave(body.roomId);
        client.leave(body.playerId);
        this.updateRoom(body.roomId);
      }
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
    let roomList = []
    let keys = Object.keys(rooms)
    keys.forEach((room) => {
      roomList.push({ roomId: room, players: rooms[room].numberOfPlayers() })
    })
    return { event: 'getrooms', data: roomList };
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
  async onStartGame(
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
      await rooms[body.roomId].startGame();
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('asktruco')
  async onAskTruco(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    if (gameExists(body.roomId) && rooms[body.roomId].turn === body.playerId &&
      rooms[body.roomId].currentTruco !== body.playerId && !rooms[body.roomId].elevenHand) {
      rooms[body.roomId].waiting = true;
      let playerToAccept = getNextPlayer(body.playerId, body.roomId);
      if (isBot(playerToAccept, body.roomId)) {
        playerToAccept = getPartner(playerToAccept, body.roomId);
      }
      if (isBot(playerToAccept, body.roomId)) {
        let accept = Math.random() > 0.5 ? true : false;
        await rooms[body.roomId].truco(body.playerId, accept);
        rooms[body.roomId].waiting = false;
        this.server.to(body.roomId).emit('responsetruco', { team: rooms[body.roomId].getTeam(playerToAccept), accept });
        this.updateRoom(body.roomId);
      } else {
        switch (rooms[body.roomId].getTeam(body.playerId)) {
          case 'team1':
            this.server.to(body.roomId).emit('acceptTruco', { team: 'team2', player: playerToAccept, asker: body.playerId });
            break;
          case 'team2':
            this.server.to(body.roomId).emit('acceptTruco', { team: 'team1', player: playerToAccept, asker: body.playerId });
            break;
        }
      }
    } else if (rooms[body.roomId].elevenHand) {
      let team = rooms[body.roomId].getTeam(body.playerId) === 'team1' ? 'team2' : 'team1';
      rooms[body.roomId].score[team] = 12;
      await rooms[body.roomId].endHand();
      this.updateRoom(body.roomId);
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
      rooms[body.roomId].waiting = false;
      this.updateRoom(body.roomId);
      this.server.to(body.roomId).emit('responsetruco', { team: rooms[body.roomId].getTeam(body.playerId), accept: body.accepted });
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
      hidden: boolean;
    },
  ) {
    if (gameExists(body.roomId) && !rooms[body.roomId].waiting) {
      if (rooms[body.roomId].playedCards.length !== rooms[body.roomId].numberOfPlayers()) {
        await rooms[body.roomId].playCard(body.card, body.playerId, body.hidden);
        this.updateRoom(body.roomId);
      }
      if (rooms[body.roomId].playedCards.length === rooms[body.roomId].numberOfPlayers()) {
        rooms[body.roomId].waiting = true;
        setTimeout(async () => {
          await rooms[body.roomId].endPartial();
          rooms[body.roomId].waiting = false;
          this.updateRoom(body.roomId);
        }, 3000);
      }
    }
  }

  @SubscribeMessage('playeleven')
  async onPlayEleven(
    @MessageBody()
    body: {
      roomId: string;
      team: string;
      accept: boolean;
    },
  ) {
    if (gameExists(body.roomId) && rooms[body.roomId].score[body.team] === 11) {
      rooms[body.roomId].elevenAccept.push(body.accept)
      if (body.accept) {
        rooms[body.roomId].points = 3;
        rooms[body.roomId].waiting = false;
        this.server.to(body.roomId).emit('playelevenres', { message: "Mão de onze aceita" });
      } else if (rooms[body.roomId].elevenAccept.length === 2 && !rooms[body.roomId].elevenAccept.includes(true)) {
        let team = body.team === 'team1' ? 'team2' : 'team1';
        rooms[body.roomId].score[team] += 1;
        await rooms[body.roomId].reDeal();
        this.server.to(body.roomId).emit('playelevenres', { message: "Mão de onze recusada" });
      }
      this.server.to(body.roomId).emit('playeleven', { team: body.team, accept: body.accept });
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('kickplayer')
  onKickPlayer(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
  ) {
    console.log(body)
    rooms[body.roomId].removePlayer(body.playerId);
    this.server.to(body.roomId).emit('kickplayer', { playerId: body.playerId });
    this.updateRoom(body.roomId);
  }

  @SubscribeMessage('addbot')
  onAddBot(
    @MessageBody()
    body: {
      roomId: string;
      team: string;
    },
  ) {
    console.log(body)
    if (gameExists(body.roomId)) {
      rooms[body.roomId].addBot(body.team);
      this.updateRoom(body.roomId);
    }
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(
    @MessageBody()
    body: {
      roomId: string;
      playerId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(body.roomId);
    client.leave(body.playerId);
  }
}
