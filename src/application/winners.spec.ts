import { TrucoTable } from "./create-game";
import { TrucoPlayer } from "./create-player";

describe("TrucoTable", () => {
    const table = new TrucoTable('exempleTableID', [], []);
    const PlayerOne = new TrucoPlayer('castro', '123')
    const PlayerTwo = new TrucoPlayer('mateus', '456')
    table.addPlayer(PlayerOne, 1);
    table.addPlayer(PlayerTwo, 2);
    table.startGame()

    it('should play some mock cards', () => {
       // table.manilha = 'J'
       // table.team1[0].hand = [{ value: 'Q', suit: 'copas' }, { value: '4', suit: 'ouros' }, { value: '5', suit: 'copas' }]
       // table.team2[0].hand = [{ value: 'Q', suit: 'ouros' }, { value: '4', suit: 'copas' }, { value: '7', suit: 'copas' }]
       console.log('manilha', table.manilha)
        table.playCard(table.team1[0].hand[0], table.team1[0].playerId)
        table.playCard(table.team2[0].hand[0], table.team2[0].playerId)
        /*expect(table.partialScore).toEqual({
            team1: 0,
            team2: 0
        })*/
        table.playCard(table.team1[0].hand[0], table.team1[0].playerId)
        table.playCard(table.team2[0].hand[0], table.team2[0].playerId)
        /*expect(table.partialScore).toEqual({
            team1: 1,
            team2: 0
        })
        expect(table.score).toEqual({
            team1: 1,
            team2: 0
        })*/
    })
})