import * as crypto from "crypto";
import { poseidon1, poseidon2 } from "poseidon-lite";
import * as readlineSync from "readline-sync";

import { BN128_SCALAR_MOD, CARDS, DUMMY_VRF } from "./constants";

const N_ROUNDS = 3;
const DRAW_SIZE = 5;

function constructDeck(): [string[], string[]] {
    const suit = process.argv[2];
    if (!suit) {
        throw new Error("Please specify suit in CLI.");
    }
    const validMoves = Array.from({ length: DRAW_SIZE }, (_, i) =>
        i.toString()
    );
    const playerDeck = CARDS.map((card) => {
        return `${suit}-${card}`;
    });
    return [validMoves, playerDeck];
}

function commitRand(): [bigint, bigint] {
    console.log("== Sampling player randomness");
    let playerRandomness = uniformBN128Scalar();
    let randCommitment = poseidon1([playerRandomness]);
    console.log("- Random value:", playerRandomness);
    console.log("- Commitment:", randCommitment);
    console.log("==");
    return [playerRandomness, randCommitment];
}

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

function sampleN(
    seed: bigint,
    arr: string[],
    sz: number
): [string[], number[]] {
    const indices = [...Array(arr.length).keys()];
    const permuteTrunc = permutate(seed, indices).slice(0, sz);
    return [permuteTrunc.map((idx) => arr[idx]), permuteTrunc];
}

function uniformBN128Scalar(): bigint {
    let sample;
    do {
        sample = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    } while (sample >= BN128_SCALAR_MOD);
    return sample;
}

function askValidMove(
    drawIndices: number[],
    validMoves: string[]
): [number, number] {
    const cardPlayed = readlineSync.question(
        `- Choose a card to play in range [0, ${drawIndices.length}): `
    );
    if (validMoves.includes(cardPlayed)) {
        const drawIdx = parseInt(cardPlayed);
        return [drawIdx, drawIndices[drawIdx]];
    }
    console.error("ERROR: Invalid input");
    return askValidMove(drawIndices, validMoves);
}

function proveHonestSelect(
    playerCommitment: bigint,
    roundRandomness: bigint,
    playerRandomness: bigint,
    cardPlayed: number
) {
    console.log(
        JSON.stringify({
            playerCommitment: playerCommitment.toString(),
            roundRandomness: roundRandomness.toString(),
            playerRandomness: playerRandomness.toString(),
            cardPlayed: cardPlayed,
        })
    );
}

function playGame() {
    let [validMoves, playerDeck] = constructDeck();
    let [playerRandomness, randCommit] = commitRand();
    DUMMY_VRF.slice(0, N_ROUNDS).forEach((roundRandomness, i) => {
        console.log(`== Round ${i + 1}`);
        const seed = poseidon2([roundRandomness, playerRandomness]);
        const [drawValues, drawIndices] = sampleN(seed, playerDeck, DRAW_SIZE);
        console.log(`- Draw:`, drawValues);
        console.log(`- Indices:`, drawIndices);
        const [moveDrawIdx, moveDeckIdx] = askValidMove(
            drawIndices,
            validMoves
        );
        console.log(
            `- Playing: ${drawValues[moveDrawIdx]} (index ${moveDeckIdx})`
        );
        proveHonestSelect(
            randCommit,
            roundRandomness,
            playerRandomness,
            moveDeckIdx
        );
        console.log("==");
    });
}

playGame();
