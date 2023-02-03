import { TrucoCard } from './create-deck';

export interface Player {
    playerId: string;
    name: string;
    hand: TrucoCard[];
}

export class TrucoPlayer {
    playerId: string;
    name: string;
    hand: TrucoCard[];

    constructor(name: string, id: string) {
        this.playerId = id;
        this.name = name;
        this.hand = [];
    }
}