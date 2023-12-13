import { poseidon1 } from "poseidon-lite";
import crypto from "crypto";

const BN128_SCALAR_MOD =
    BigInt(
        21888242871839275222246405745257275088548364400416034343698204186575808495617
    );
const SUIT = "SPADES";
const CARDS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
];
const playerDeck = CARDS.map((card) => `${card}-${SUIT}`);
const vrfPlaceholder = Array(10)
    .fill(0)
    .map(() => uniformBN128Scalar());

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
    return permutate(seed, arr).slice(0, sz);
}

function uniformBN128Scalar(): bigint {
    let sample;
    do {
        sample = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    } while (sample >= BN128_SCALAR_MOD);
    return sample;
}

let playerRandomness = uniformBN128Scalar();
let randCommitment = poseidon1([playerRandomness]);

console.log("selected randomness:", playerRandomness);
console.log("randomness commitment:", randCommitment);

vrfPlaceholder.forEach((roundRandomness) => {
    console.log();
});
