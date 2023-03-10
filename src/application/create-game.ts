import CreateDeck, { TrucoCard } from './create-deck';
import { Player, TrucoPlayer } from './create-player';

export interface Score {
  team1: number;
  team2: number;
}
export interface PlayedCard {
  card: TrucoCard;
  playerId: string;
}
const suitsOrder = ['ouros', 'espada', 'copas', 'paus'];
const valuesOrder = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3', '4'];

export class TrucoTable {
  tableId: string;
  team1: Player[];
  team2: Player[];
  cards: TrucoCard[];
  score: Score;
  manilha: string;
  vira: TrucoCard;
  playedCards: PlayedCard[];
  dealer: Player;
  turn: string;
  points: number;
  partialScore: Score;
  currentTruco: string;
  gameStarted: boolean;
  gameFinished: boolean;
  createdBy: string;
  waiting: boolean;
  elevenHand: boolean;
  winner: string;
  goldHand: boolean;
  elevenAccept: boolean[];
  lastUpdate: Date;
  orangeTruck: 'team1' | 'team2' | '';

  constructor(tableId: string, playerId: string) {
    this.tableId = tableId;
    this.cards = CreateDeck();
    this.score = {
      team1: 0,
      team2: 0,
    };
    this.partialScore = {
      team1: 0,
      team2: 0,
    };
    this.playedCards = [];
    this.points = 1;
    this.team1 = [];
    this.team2 = [];
    this.manilha = '';
    this.turn = '';
    this.dealer = {} as Player;
    this.vira = {} as TrucoCard;
    this.currentTruco = '';
    this.gameStarted = false;
    this.gameFinished = false;
    this.createdBy = playerId;
    this.waiting = true;
    this.elevenHand = false;
    this.goldHand = false;
    this.winner = '';
    this.lastUpdate = new Date();
    this.orangeTruck = '';
  }



  isPlayerOnTable(playerId: string) {
    return (
      this.team1.find((player) => player.playerId === playerId) ||
      this.team2.find((player) => player.playerId === playerId)
    );
  }

  getPlayer(playerId: string) {
    if (this.isPlayerOnTable(playerId)) {
      if (this.getTeam(playerId) === 'team1') {
        return this.team1.filter((player) => player.playerId === playerId)[0];
      } else {
        return this.team2.filter((player) => player.playerId === playerId)[0];
      }
    }
  }

  changeTeam(playerId: string) {
    if (!this.gameStarted && this.isPlayerOnTable(playerId)) {
      let player = this.getPlayer(playerId);
      if (this.getTeam(playerId) === 'team1') {
        this.team1 = this.team1.filter((plyr) => plyr.playerId !== playerId);
        this.team2.push(player);
      } else {
        this.team2 = this.team2.filter((plyr) => plyr.playerId !== playerId);
        this.team1.push(player);
      }
    }
  }

  numberOfPlayers() {
    return this.team1.length + this.team2.length;
  }

  checkReady() {
    return (
      this.team1.filter((player) => player.ready).length === this.team1.length &&
      this.team2.filter((player) => player.ready).length === this.team2.length
    );
  }

  async startGame() {
    if (this.checkReady() && this.isReadyToStart()) {
      this.dealer = this.team1[0];
      this.dealCards();
      this.score.team1 = 0;
      this.score.team2 = 0;
      this.turn = this.team2[0].playerId;
      this.gameStarted = true;
      this.gameFinished = false;
      this.winner = '';
      this.waiting = false;
      await this.reDeal();
    }

  }

  isReadyToStart() {
    return (
      this.team1.length === this.team2.length &&
      this.team1.length === 2
    );
  }

  addPlayer(player: Player, team: number) {
    if (team === 1) {
      this.team1.push(player);
    } else {
      this.team2.push(player);
    }
  }

  addBot(team: 'team1' | 'team2') {
    if (this[team].length < 2) {
      let botId = `Bot${Math.floor(Math.random() * 1001)}`;
      let bot = { playerId: botId, name: 'Bot', ready: true, hand: [] }
      this[team].push(bot);
    }
  }

  removePlayer(playerId: string) {
    console.log('removing player ' + playerId)
    if (this.gameStarted) {
      let player = this.getPlayer(playerId);
      player.name = 'Bot';
      let botId = `Bot${Math.floor(Math.random() * 1001)}`
      player.playerId = botId;
      if (this.turn === playerId) {
        this.turn = botId;
      }
      if (this.dealer.playerId === playerId) {
        this.dealer = player;
      }
      if (this.playedCards.some((card) => card.playerId === playerId)) {
        this.playedCards.find((card) => card.playerId === playerId).playerId = botId;
      }
    } else {
      switch (this.getTeam(playerId)) {
        case 'team1':
          this.team1 = this.team1.filter(
            (player) => player.playerId !== playerId
          );
          break;
        case 'team2':
          this.team2 = this.team2.filter(
            (player) => player.playerId !== playerId
          );
          break;
      }
    }
  }

  async dealCards() {
    for (let i = 0; i < 3; i++) {
      this.team2.forEach((player) => {
        let randomCard = this.cards[this.getRandomCard()];
        player.hand.push(randomCard);
        this.cards = this.cards.filter((card) => card != randomCard);
      });
      this.team1.forEach((player) => {
        let randomCard = this.cards[this.getRandomCard()];
        player.hand.push(randomCard);
        this.cards = this.cards.filter((card) => card != randomCard);
      });
    }
    let vira = this.getRandomCard();
    this.vira = this.cards[vira];
    this.manilha = valuesOrder[valuesOrder.indexOf(this.vira.value) + 1];
  }

  async playCard(card: TrucoCard, playerId: string, hidden: boolean) {
    console.log(
      'player: ' +
      playerId +
      ' turn: ' +
      this.turn +
      ' card: ' +
      card.value +
      ' ' +
      card.suit,
    );
    if (this.turn === playerId && this.playedCards.length < 4 && !this.waiting) {
      let player = this.getPlayer(playerId);
      if (player.hand.some((handCard) => handCard.value === card.value &&
        handCard.suit === card.suit)) {
        for (let i = 0; i < player.hand.length; i++) {
          if (player.hand[i].value === card.value && player.hand[i].suit === card.suit) {
            player.hand.splice(i, 1);
            if (hidden) this.playedCards.push({ card: { value: 'hidden', suit: 'hidden' }, playerId: playerId });
            else this.playedCards.push({ card: card, playerId: playerId });
            await this.switchTurn();
            if (this.isBot(this.turn) && this.playedCards.length < 4) await this.botPlay()
            break;
          }
        }
      } else return 'Card not in hand';
    } else return 'Not your turn';
  }

  isBot(playerId: string) {
    let player = this.getPlayer(playerId)
    return player.name === 'Bot' && player.playerId !== player.name;
  }

  async botPlay() {
    let player = this.getPlayer(this.turn);
    let card = player.hand[0];
    await this.playCard(card, this.turn, false);
  }

  async endPartial() {
    let winner = this.getWinner();
    if (this.team1[0].hand.length === 2 && this.team2[0].hand.length === 2 && this.team1[1].hand.length === 2 && this.team2[1].hand.length === 2) {
      this.orangeTruck = this.getTeam(winner.playerId);
    }
    this.playedCards = [];
    if (winner.playerId === 'draw') {
      this.partialScore.team1 += 1;
      this.partialScore.team2 += 1;
      this.setTurn(this.dealer.playerId);
      this.switchTurn();
    } else {
      this.setTurn(winner.playerId);
      if (
        this.team1.filter((player) => player.playerId === winner.playerId)
          .length > 0
      ) {
        this.partialScore.team1 += 1;
      } else if (
        this.team2.filter((player) => player.playerId === winner.playerId)
          .length > 0
      ) {
        this.partialScore.team2 += 1;
      }
    } if (this.partialScore.team1 === this.partialScore.team2 && this.partialScore.team1 === 3) {
      //rare case when draw all hands
      await this.endHand();
    } else if (
      this.partialScore.team1 >= 2 &&
      this.partialScore.team1 > this.partialScore.team2 ||
      this.partialScore.team2 >= 2 &&
      this.partialScore.team2 > this.partialScore.team1 ||
      this.team1.filter((player) => player.hand.length === 0).length ===
      this.team1.length &&
      this.team2.filter((player) => player.hand.length === 0).length ===
      this.team2.length
    ) {
      await this.endHand();
    }
  }

  async reDeal() {
    this.points = 1;
    this.goldHand = false;
    this.elevenAccept = [];
    this.currentTruco = '';
    this.playedCards = [];
    this.partialScore.team1 = 0;
    this.partialScore.team2 = 0;
    this.orangeTruck = '';
    this.switchDealer();
    this.turn = this.dealer.playerId;
    this.switchTurn();
    this.cards = CreateDeck();
    const resetHands = async () => {
      this.team1.forEach((player) => {
        player.hand = [];
      });
      this.team2.forEach((player) => {
        player.hand = [];
      });
    }
    await resetHands();
    await this.dealCards();
    this.points = 1;
    this.elevenHand = false;
    if (this.score.team1 === 11 && this.score.team2 === 11) {
      this.goldHand = true;
      this.elevenHand = false;
      this.waiting = false;
    } else if (this.score.team1 === 11 || this.score.team2 === 11) {
      this.elevenHand = true;
      this.waiting = true;
      this.elevenAccept = []
    }
  }

  async endHand(refusedTruco?: boolean) {
    if (refusedTruco) {
      this.score[this.getTeam(this.currentTruco)] += this.points;
    } else {
      if (this.partialScore.team1 > this.partialScore.team2) {
        this.score.team1 += this.points;
      } else if (this.partialScore.team2 > this.partialScore.team1) {
        this.score.team2 += this.points;
      } else if (this.partialScore.team1 === this.partialScore.team2) {
        this.score[this.orangeTruck] += this.points;
      }
    }
    if (this.score.team1 >= 12 || this.score.team2 >= 12) {
      await this.endGame();
    } else {
      console.log(this.partialScore)
      console.log(this.score)
      await this.reDeal()
    }
  }

  async endGame() {
    this.gameFinished = true;
    this.gameStarted = false;
    this.elevenAccept = [];
    this.waiting = true;
    this.team1.map((player) => {
      if (!this.isBot(player.playerId)) {
        player.ready = false
      }
    })
    this.team2.map((player) => {
      if (!this.isBot(player.playerId)) {
        player.ready = false
      }
    })
    if (this.score.team1 > this.score.team2) {
      this.winner = `Vencedores: ${this.team1[0].name} e ${this.team1[1].name}`;
    } else if (this.score.team2 > this.score.team1) {
      this.winner = `Vencedores: ${this.team2[0].name} e ${this.team2[1].name}`;
    }

  }

  async truco(playerId: string, accepted: boolean) {
    //playerId do player que pediu o truco
    console.log(playerId, accepted)
    this.currentTruco = playerId;
    if (accepted) {
      switch (this.points) {
        case 1:
          this.points = 3;
          break;
        case 3:
          this.points = 6;
          break;
        case 6:
          this.points = 9;
          break;
        case 9:
          this.points = 12;
          break;
      }
    } else if (!accepted) {
      await this.endHand(true);
    } else {
      return;
    }
  }

  setTurn(playerId: string) {
    this.turn = playerId;
  }

  async switchTurn() {
    if (this.numberOfPlayers() === 4) {
      switch (this.turn) {
        case this.team1[0].playerId:
          this.setTurn(this.team2[0].playerId);
          break;
        case this.team2[0].playerId:
          this.setTurn(this.team1[1].playerId);
          break;
        case this.team1[1].playerId:
          this.setTurn(this.team2[1].playerId);
          break;
        case this.team2[1].playerId:
          this.setTurn(this.team1[0].playerId);
          break;
      }
    } else if (this.numberOfPlayers() === 2) {
      switch (this.turn) {
        case this.team1[0].playerId:
          this.setTurn(this.team2[0].playerId);
          break;
        case this.team2[0].playerId:
          this.setTurn(this.team1[0].playerId);
          break;
      }
    } else if (this.numberOfPlayers() === 6) {
      switch (this.turn) {
        case this.team1[0].playerId:
          this.setTurn(this.team2[0].playerId);
          break;
        case this.team2[0].playerId:
          this.setTurn(this.team1[1].playerId);
          break;
        case this.team1[1].playerId:
          this.setTurn(this.team2[1].playerId);
          break;
        case this.team2[1].playerId:
          this.setTurn(this.team1[2].playerId);
          break;
        case this.team1[2].playerId:
          this.setTurn(this.team2[2].playerId);
          break;
        case this.team2[2].playerId:
          this.setTurn(this.team1[0].playerId);
          break;
      }
    }
  }

  switchDealer() {
    if (this.numberOfPlayers() === 4) {
      switch (this.dealer) {
        case this.team1[0]:
          this.dealer = this.team2[0];
          break;
        case this.team2[0]:
          this.dealer = this.team1[1];
          break;
        case this.team1[1]:
          this.dealer = this.team2[1];
          break;
        case this.team2[1]:
          this.dealer = this.team1[0];
          break;
      }
    } else if (this.numberOfPlayers() === 2) {
      switch (this.dealer) {
        case this.team1[0]:
          this.dealer = this.team2[0];
          break;
        case this.team2[0]:
          this.dealer = this.team1[0];
          break;
      }
    } else if (this.numberOfPlayers() === 6) {
      switch (this.dealer) {
        case this.team1[0]:
          this.dealer = this.team2[0];
          break;
        case this.team2[0]:
          this.dealer = this.team1[1];
          break;
        case this.team1[1]:
          this.dealer = this.team2[1];
          break;
        case this.team2[1]:
          this.dealer = this.team1[2];
          break;
        case this.team1[2]:
          this.dealer = this.team2[2];
          break;
        case this.team2[2]:
          this.dealer = this.team1[0];
          break;
      }
    }
  }

  getWinner() {
    let winner: PlayedCard = {
      card: { value: '', suit: '' },
      playerId: '',
    };
    this.playedCards.map((c) => {
      if (c.card.value === this.manilha) {
        if (winner.card.value === this.manilha) {
          if (
            suitsOrder.indexOf(c.card.suit) >
            suitsOrder.indexOf(winner.card.suit)
          ) {
            winner = c;
          }
        } else {
          winner = c;
        }
      } else if (winner.card.value !== this.manilha) {
        if (winner.card.value == c.card.value && this.getTeam(winner.playerId) !== this.getTeam(c.playerId)) {
          winner.playerId = 'draw';
        } else if (
          valuesOrder.indexOf(c.card.value) >
          valuesOrder.indexOf(winner.card.value)
        ) {
          winner = c;
        }
      }
    });
    return winner;
  }

  searchPlayer(playerId: string) {
    let player: Player;
    this.team1.map((p) => {
      if (p.playerId === playerId) {
        player = p;
      }
    });
    this.team2.map((p) => {
      if (p.playerId === playerId) {
        player = p;
      }
    });
    return player;
  }

  setReady(playerId: string) {

    if (this.isPlayerOnTable(playerId)) {
      let isReady = this.searchPlayer(playerId).ready;
      let team = this.getTeam(playerId);
      switch (team) {
        case 'team1':
          isReady ? this.team1.find((p) => p.playerId === playerId).ready = false :
            this.team1.find((p) => p.playerId === playerId).ready = true;
          break;
        case 'team2':
          isReady ? this.team2.find((p) => p.playerId === playerId).ready = false :
            this.team2.find((p) => p.playerId === playerId).ready = true;
          break;
        default: break;
      }
    }
  }

  getTeam(playerId: string) {
    if (this.isPlayerOnTable(playerId)) {
      if (this.team1.find((p) => p.playerId === playerId)) {
        return 'team1';
      } else {
        return 'team2';
      }
    }
  }

  getTable() {
    return {
      tableId: this.tableId,
      team1: this.team1,
      team2: this.team2,
      score: this.score,
      partialScore: this.partialScore,
      turn: this.turn,
      dealer: this.dealer,
      vira: this.vira,
      manilha: this.manilha,
      points: this.points,
      playedCards: this.playedCards,
      lastTruco: this.currentTruco,
      createdBy: this.createdBy,
      gameStarted: this.gameStarted,
      gameFinished: this.gameFinished,
      elevenHand: this.elevenHand,
      winner: this.winner,
      waiting: this.waiting
    };
  }

  getPlayedCards() {
    return this.playedCards;
  }

  getRandomCard() {
    return Math.floor(Math.random() * this.cards.length);
  }
}
