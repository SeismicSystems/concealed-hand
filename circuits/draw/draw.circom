pragma circom 2.1.0;

/*
random_permute.circom
Circom circuit to permute an array from a hash value.

License
MIT Copyright (c) 2022 Jordi Baylina
*/
include "../permutation.circom";

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * TODO: summary
 */
template Draw() {
    /*
     * Public signals:
     * - playerCommitment: hash of player randomness which is posted onchain.
     * - roundRandomness: random value from VRF source used in one round.
     */
    signal input playerCommitment;
    signal input roundRandomness;

    /*
     * Private signals:
     * - playerRandomness: player chosen random field element used every round.
     * - cardsPlayed: list of <=5 "cards" (indices in 1..13) which player used
     *       in round. Every 0 in cardsPlayed is a placeholder signifying that
     *       not all 5 cards were played.
     */
    signal input playerRandomness;
    signal input cardPlayed;

    // Array of "cards" 
    var CARDS[13] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    // Compute hash used to pick random subset of cards
    signal hash <== Poseidon(2)([roundRandomness, playerRandomness]);

    signal permutedCards[13] <== RandomPermutate(13)(hash, CARDS);

    signal prods[6];
    prods[0] <== cardPlayed;
    for (var j = 0; j < 5; j++) {
        prods[j + 1] <== prods[j] * permutedCards[j];
    }
    prods[5] === 0;

    signal circuitPlayerCommitment <== Poseidon(1)([playerRandomness]);
    playerCommitment === circuitPlayerCommitment;
}

component main { public [ playerRandomness, roundRandomness ] } = Draw();