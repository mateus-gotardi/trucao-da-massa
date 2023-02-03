import CreateDeck from "./create-deck";

describe("CreateDeck", () => {
    it("should create a deck of 40 cards", () => {
        const deck = CreateDeck();
        expect(deck.length).toBe(40);
    });

        
});