import { TrucoTable } from "./create-game";
import { TrucoPlayer } from "./create-player";

describe("TrucoTable", () => {
    const table = new TrucoTable('exempleTableID', 'testUser');
    it('should be able to create a Truco Table', () => {
        const PlayerOne = new TrucoPlayer('castro', '123')
        const PlayerTwo = new TrucoPlayer('mateus', '456')

        table.addPlayer(PlayerOne, 1);
        table.addPlayer(PlayerTwo, 2);
        const tableInfos = table.getTable();

        expect(tableInfos).toEqual({
            tableId: 'exempleTableID',
            team1: [{
                name: 'castro',
                playerId: '123',
                hand: [],
            }],
            team2: [{
                name: 'mateus',
                playerId: '456',
                hand: [],
            }],
            score: {
                team1: 0,
                team2: 0
            }
        });

    })
    it('should start a game', () => {
        table.startGame();
        expect(table.getTable().team1[0].hand.length).toEqual(3)
        expect(table.getTable().team2[0].hand.length).toEqual(3)
        expect(table.cards.length).toEqual(33)

    })

    it('should be able to play a card', () => {
        table.playCard(table.team2[0].hand[0], table.team2[0].playerId);
        expect(table.getTable().team2[0].hand.length).toEqual(2)
        expect(table.playedCards.length).toEqual(1)
    })

    it('should change turn', () => {
        expect(table.turn).toEqual(table.team1[0].playerId)
    })

    it('should not play a card if it is not your turn', () => {
        table.playCard(table.team2[0].hand[0], table.team2[0].playerId);
        expect(table.getTable().team2[0].hand.length).toEqual(2)
        expect(table.playedCards.length).toEqual(1)
    })
});