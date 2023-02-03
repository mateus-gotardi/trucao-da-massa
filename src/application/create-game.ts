import CreateDeck, { TrucoCard } from "./create-deck";
import { Player } from "./create-player";

export interface Score {
    team1: number;
    team2: number;
}
export interface PlayedCard {
    card: TrucoCard;
    playerId: string;
}
const suitsOrder = ["ouros", "espada", "copas", "paus"];
const valuesOrder = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3", "4"];

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
    currentTruco: Player[];

    constructor(tableId: string, team1: Player[], team2: Player[]) {
        this.tableId = tableId;
        this.cards = CreateDeck();
        this.team1 = team1;
        this.team2 = team2;
        this.score = {
            team1: 0,
            team2: 0
        }
        this.partialScore = {
            team1: 0,
            team2: 0
        }
        this.playedCards = [];
        this.points = 1;
        this.currentTruco = [];
    }

    numberOfPlayers() {
        return this.team1.length + this.team2.length;
    }
    startGame() {
        this.dealer = this.team1[0];
        this.dealCards();
        this.turn = this.team2[0].playerId;
    }
    addPlayer(player: Player, team: number) {
        if (team === 1) {
            this.team1.push(player);
        } else {
            this.team2.push(player);
        }
    }



    dealCards() {
        for (let i = 0; i < 3; i++) {
            switch (this.dealer) {
                case this.team1[0] || this.team1[1]:
                    this.team2.forEach(player => {
                        let randomCard = this.cards[this.getRandomCard()]
                        player.hand.push(randomCard);
                        this.cards = this.cards.filter(card => card != randomCard)
                    });
                    this.team1.forEach(player => {
                        let randomCard = this.cards[this.getRandomCard()]
                        player.hand.push(randomCard);
                        this.cards = this.cards.filter(card => card != randomCard)
                    });
                    break;
                case this.team2[0] || this.team2[1]:
                    this.team1.forEach(player => {
                        let randomCard = this.cards[this.getRandomCard()]
                        player.hand.push(randomCard);
                        this.cards = this.cards.filter(card => card != randomCard)
                    });
                    this.team2.forEach(player => {
                        let randomCard = this.cards[this.getRandomCard()]
                        player.hand.push(randomCard);
                        this.cards = this.cards.filter(card => card != randomCard)
                    });
            }
        }
        let vira = this.getRandomCard();
        this.vira = this.cards[vira];
        this.manilha = valuesOrder[valuesOrder.indexOf(this.vira.value) + 1];
        this.cards = this.cards.filter(card => card != this.vira)
    }


    playCard(card: TrucoCard, playerId: string) {
        console.log("player: " + playerId + " turn: " + this.turn + " card: " + card.value + " " + card.suit)
        if (this.turn === playerId) {
            this.playedCards.push({ card: card, playerId: this.turn });
            this.team1.forEach(player => {
                if (player.playerId === playerId) {
                    player.hand = player.hand.filter(handCard => handCard != card);
                }
            })
            this.team2.forEach(player => {
                if (player.playerId === playerId) {
                    player.hand = player.hand.filter(handCard => handCard != card);
                }
            })
            this.switchTurn();
            if (this.playedCards.length === this.numberOfPlayers()) {
                this.endPartial();
            }
        }
        else return "Not your turn";
    }

    endPartial() {
        let winner = this.getWinner();
        this.playedCards = [];
        if (winner.playerId === 'draw') {
            this.setTurn(this.dealer.playerId);
            this.switchTurn();
        } else {
            this.setTurn(winner.playerId);
        }
        if (this.team1.filter(player => player.playerId === winner.playerId).length > 0) {
            this.partialScore.team1 += 1;
        } else if (this.team2.filter(player => player.playerId === winner.playerId).length > 0) {
            this.partialScore.team2 += 1;
        }
        if (this.partialScore.team1 === 0 && this.partialScore.team2 === 0 &&
            this.team1.filter(player => player.hand.length === 1).length === this.team1.length &&
            this.team2.filter(player => player.hand.length === 1).length === this.team2.length
        ) {
            if (this.team1.filter(player => player.playerId === winner.playerId).length > 0) {
                this.partialScore.team1 += 1;
                this.endHand()
            } else if (this.team2.filter(player => player.playerId === winner.playerId).length > 0) {
                this.partialScore.team2 += 1;
                this.endHand()
            }
        }
        if (this.partialScore.team1 >= 2 || this.partialScore.team2 >= 2 ||
            this.team1.filter(player => player.hand.length === 0).length === this.team1.length &&
            this.team2.filter(player => player.hand.length === 0).length === this.team2.length) {
            this.endHand()
        }
    }

    endHand() {
        if (this.partialScore.team1 > this.partialScore.team2) {
            this.score.team1 += this.points;
        } else if (this.partialScore.team2 > this.partialScore.team1) {
            this.score.team2 += this.points;
        }
        this.partialScore = {
            team1: 0,
            team2: 0
        }
        if (this.score.team1 >= 12 || this.score.team2 >= 12) {
            this.endGame();
        } else {
            this.points = 1;
            this.switchDealer()
            this.turn = this.dealer.playerId;
            this.switchTurn()
            this.cards = CreateDeck();
            this.dealCards()
        }
    }

    endGame() {
        this.score = {
            team1: 0,
            team2: 0
        }
        this.partialScore = {
            team1: 0,
            team2: 0
        }
        this.points = 1;
        this.switchDealer()
        this.turn = this.dealer.playerId;
        this.switchTurn()
        this.cards = CreateDeck();
    }

    truco(team: Player[], accepted: boolean) {
        if (this.currentTruco !== team && accepted) {
            switch (this.points) {
                case 1: this.points = 3; break;
                case 3: this.points = 6; break;
                case 6: this.points = 9; break;
                case 9: this.points = 12; break;
            }
            this.currentTruco = team;
        } else if (!accepted) {
            this.endHand();
        } else {
            return
        }
    }


    setTurn(playerId: string) {
        this.turn = playerId;
    }

    switchTurn() {
        if (this.numberOfPlayers() === 4) {
            switch (this.turn) {
                case this.team1[0].playerId: this.turn = this.team2[0].playerId; break;
                case this.team2[0].playerId: this.turn = this.team1[1].playerId; break;
                case this.team1[1].playerId: this.turn = this.team2[1].playerId; break;
                case this.team2[1].playerId: this.turn = this.team1[0].playerId; break;
            }
        } else if (this.numberOfPlayers() === 2) {
            switch (this.turn) {
                case this.team1[0].playerId: this.turn = this.team2[0].playerId; break;
                case this.team2[0].playerId: this.turn = this.team1[0].playerId; break;
            }
        } else if (this.numberOfPlayers() === 6) {
            switch (this.turn) {
                case this.team1[0].playerId: this.turn = this.team2[0].playerId; break;
                case this.team2[0].playerId: this.turn = this.team1[1].playerId; break;
                case this.team1[1].playerId: this.turn = this.team2[1].playerId; break;
                case this.team2[1].playerId: this.turn = this.team1[2].playerId; break;
                case this.team1[2].playerId: this.turn = this.team2[2].playerId; break;
                case this.team2[2].playerId: this.turn = this.team1[0].playerId; break;
            }
        }
    }

    switchDealer() {
        if (this.numberOfPlayers() === 4) {
            switch (this.dealer) {
                case this.team1[0]: this.dealer = this.team2[0]; break;
                case this.team2[0]: this.dealer = this.team1[1]; break;
                case this.team1[1]: this.dealer = this.team2[1]; break;
                case this.team2[1]: this.dealer = this.team1[0]; break;
            }
        } else if (this.numberOfPlayers() === 2) {
            switch (this.dealer) {
                case this.team1[0]: this.dealer = this.team2[0]; break;
                case this.team2[0]: this.dealer = this.team1[0]; break;
            }
        } else if (this.numberOfPlayers() === 6) {
            switch (this.dealer) {
                case this.team1[0]: this.dealer = this.team2[0]; break;
                case this.team2[0]: this.dealer = this.team1[1]; break;
                case this.team1[1]: this.dealer = this.team2[1]; break;
                case this.team2[1]: this.dealer = this.team1[2]; break;
                case this.team1[2]: this.dealer = this.team2[2]; break;
                case this.team2[2]: this.dealer = this.team1[0]; break;
            }
        }

    }

    getWinner() {
        let winner: PlayedCard = {
            card: { value: '', suit: '' },
            playerId: ''
        };
        this.playedCards.map((c) => {
            if (c.card.value === this.manilha) {
                if (winner.card.value === this.manilha) {
                    if (suitsOrder.indexOf(c.card.suit) > suitsOrder.indexOf(winner.card.suit)) {
                        winner = c;
                    }
                } else {
                    winner = c;
                }
            } else if (winner.card.value !== this.manilha) {
                if (winner.card.value == c.card.value) {
                    winner.playerId = 'draw'
                } else if (valuesOrder.indexOf(c.card.value) > valuesOrder.indexOf(winner.card.value)) {
                    winner = c;
                }
            }
        })
        return winner;
    }

    getTable() {
        return {
            tableId: this.tableId,
            team1: this.team1,
            team2: this.team2,
            score: this.score
        }
    }

    getPlayedCards() {
        return this.playedCards;
    }

    getRandomCard() {
        return Math.floor(Math.random() * this.cards.length);
    }
}