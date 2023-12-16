pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

include "permutation.circom";
include "utils.circom";

/*
 *
 * Assert that the index <cardPlayed> is in a <DRAW_SIZE> sized draw from 
 * a <DECK_SZ> deck of cards. This draw is seeded by <roundRandomness> and 
 * <playerRandomness>, the latter of which corresponds to <randomCommitment>.
 *
 * Public signals
 * - playerCommitment: commitment to player provided randomness
 * - roundRandomness: random value from VRF source for this round
 * - cardPlayed: card (value of 1..DECK_SZ) which was played this round
 *
 * Private signals
 * - playerRandomness: player contributed randomness
 *
 */
template Draw() {
    signal input playerCommitment;
    signal input roundRandomness;
    signal input cardPlayed;
    signal input playerRandomness;

    var DECK_SZ = 13;
    var DRAW_SZ = 5;

    signal circuitPlayerCommitment <== Poseidon(1)([playerRandomness]);
    playerCommitment === circuitPlayerCommitment;

    signal indices[DECK_SZ] <== IncrementingArray(DECK_SZ)();
    signal seed <== Poseidon(2)([roundRandomness, playerRandomness]);
    signal permutedCards[DECK_SZ] <== RandomPermutate(DECK_SZ)(seed, indices);

    signal draw[DRAW_SZ] <== Truncate(DECK_SZ, DRAW_SZ)(permutedCards);
    signal inDraw <== ArrayInclusion(DRAW_SZ)(cardPlayed, draw);
    inDraw === 1;
}

component main { public [ playerCommitment, roundRandomness, cardPlayed ] } = 
    Draw();
