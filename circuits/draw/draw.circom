pragma circom 2.1.0;

/*
random_permute.circom
Circom circuit to permute an array from a hash value.

License
MIT Copyright (c) 2022 Jordi Baylina
*/

include "../node_modules/circomlib/circuits/poseidon.circom";

include "permutation.circom";
include "utils.circom";

/*
 *
 * Public signals:
 * - playerCommitment: hash of player randomness which is posted onchain
 * - roundRandomness: random value from VRF source used in one round
 * - cardPlayed: card (value of 1..13) which was played in-round
 *
 * Private signals:
 * - playerRandomness: player chosen random field element used every round.
 *
 */
template Draw() {
    signal input playerCommitment;
    signal input roundRandomness;
    signal input cardPlayed;
    signal input playerRandomness;

    var DECK_SZ = 13;
    var DRAW_SZ = 5;

    signal indices[DECK_SZ] <== IncrementingArray(DECK_SZ)();
    signal seed <== Poseidon(2)([roundRandomness, playerRandomness]);
    signal permutedCards[DECK_SZ] <== RandomPermutate(DECK_SZ)(seed, indices);

    signal draw[DRAW_SZ] <== Truncate(DECK_SZ, DRAW_SZ)(permutedCards);

    signal inDraw <== ArrayInclusion(DRAW_SZ)(cardPlayed, draw);
    inDraw === 1;

    signal circuitPlayerCommitment <== Poseidon(1)([playerRandomness]);
    playerCommitment === circuitPlayerCommitment;
}

component main { public [ playerCommitment, roundRandomness, cardPlayed ] } = 
    Draw();
