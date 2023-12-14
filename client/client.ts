import crypto from "crypto";
import { poseidon1, poseidon2 } from "poseidon-lite";
import * as readlineSync from "readline-sync";

import { BN128_SCALAR_MOD, CARDS, DUMMY_VRF } from "./constants";

const N_ROUNDS = 3;
const DRAW_SIZE = 5;
const suit = process.argv[2];
const validMoves = Array.from({length: DRAW_SIZE}, (_, i) => (i + 1).toString());

// https://github.com/jbaylina/random_permute/blob/main/test/test.js
function permutate(seed: bigint, arr: number[]): number[] {
    let arrCopy: number[] = [...arr];
    seed = seed & ((1n << 250n) - 1n);
    for (let i = arrCopy.length; i > 0; i--) {
        const r = Number(seed % BigInt(i));
        [arrCopy[i - 1], arrCopy[r]] = [arrCopy[r], arrCopy[i - 1]];
        seed = (seed - BigInt(r)) / BigInt(i);
    }
    return arrCopy;
}

function sampleN(seed: bigint, arr: string[], sz: number) {
    const indices = [...Array(arr.length).keys()];
    const permutedIndicesTrunc = permutate(seed, indices).slice(0, sz);
    return permutedIndicesTrunc.map((index) => arr[index]);
}

function uniformBN128Scalar(): bigint {
    let sample;
    do {
        sample = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    } while (sample >= BN128_SCALAR_MOD);
    return sample;
}

function askValidMove(draw_size: Number): Number {
    const move = readlineSync.question(
        `Choose a card to play [1, ${DRAW_SIZE}]:`
    );
    if (validMoves.includes(move)) {
        return parseInt(move);
    }
    console.error("ERROR: Invalid input");
    return askValidMove(draw_size);
}

let playerRandomness = uniformBN128Scalar();
let randCommitment = poseidon1([playerRandomness]);

console.log("selected randomness:", playerRandomness);
console.log("randomness commitment:", randCommitment);

const playerDeck = CARDS.map((card) => {
    return `${suit}-${card}`;
});

DUMMY_VRF.slice(0, N_ROUNDS).forEach((roundRandomness) => {
    const seed = poseidon2([roundRandomness, playerRandomness]);
    const draw = sampleN(seed, playerDeck, DRAW_SIZE);
    console.log("draw:", draw);
    const move = askValidMove(DRAW_SIZE);
});
