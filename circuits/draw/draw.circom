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
     * - cardPlayed: card (value of 1..13) which was played in-round.
     */
    signal input playerCommitment;
    signal input roundRandomness;
    signal input cardPlayed;

    /*
     * Private signals:
     * - playerRandomness: player chosen random field element used every round.
     */
    signal input playerRandomness;

    // Array of "cards" 
    var CARDS[13] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // Compute hash used to pick random subset of cards
    signal hash <== Poseidon(2)([roundRandomness, playerRandomness]);

    signal permutedCards[13] <== RandomPermutate(13)(hash, CARDS);

    signal prods[6];
    prods[0] <== 1;
    for (var j = 0; j < 5; j++) {
        prods[j + 1] <== prods[j] * (cardPlayed - permutedCards[j]);
    }
    prods[5] === 0;

    signal circuitPlayerCommitment <== Poseidon(1)([playerRandomness]);
    playerCommitment === circuitPlayerCommitment;
}

component main { public [ playerRandomness, roundRandomness, cardPlayed ] } = 
    Draw();