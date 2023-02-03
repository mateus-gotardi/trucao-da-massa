export interface TrucoCard {
    value: string;
    suit: string;
}


const CreateDeck = (): TrucoCard[] => {
    const deck = [];
    const suits = ["ouros", "espada", "copas", "paus" ];
    const values = "4,5,6,7,Q,J,K,A,2,3";

    for (let value of values.split(",")) {
        for (let suit of suits) {
            deck.push({
                value,
                suit,
            });
        }
    }

    return deck;
}
export default CreateDeck; 