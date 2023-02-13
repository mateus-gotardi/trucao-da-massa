import { TrucoCard } from './create-deck';

export interface Player {
    playerId: string;
    name: string;
    hand: TrucoCard[];
    ready: boolean;
}

export class TrucoPlayer {
    playerId: string;
    name: string;
    hand: TrucoCard[];
    ready: boolean = false;

    constructor(name: string, id: string) {
        this.playerId = id;
        this.name = name;
        this.hand = [];
    }
}