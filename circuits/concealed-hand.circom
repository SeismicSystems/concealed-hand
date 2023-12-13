pragma circom 2.1.0;

/*
random_permute.circom
Circom circuit to permute an array from a hash value.

License
MIT Copyright (c) 2022 Jordi Baylina
*/
include "permutation.circom";

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * TODO: summary
 */
template ConcealedHand() {

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
     *       in round.
     */
    signal input playerRandomness;
    signal input playerCards[5];

    signal output out;
    out === 1;
}