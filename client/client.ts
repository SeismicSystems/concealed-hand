import { poseidon2 } from "poseidon-lite";
import * as readlineSync from "readline-sync";
import { CARDS, DUMMY_VRF } from "./constants";
import {
    StartRoundEvent,
    commitRand,
    contract,
    publicClient,
    submitDrawProof,
} from "./utils";

const N_ROUNDS = 3;
const DRAW_SIZE = 5;

const suit = process.argv[2];

let validMoves: string[], playerDeck: string[];
let playerRandomness: bigint, playerCommitment: bigint;

function constructDeck(): [string[], string[]] {
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

async function listenForStartRound() {
    console.log("LISTENING FOR START ROUND");
    publicClient.watchEvent({
        address: contract.address,
        event: StartRoundEvent,
        strict: true,
        onLogs: async (logs) => {
            const roundNumber = Number(logs[0].args.roundIndex) + 1;
            const roundRandomness = DUMMY_VRF[roundNumber - 1];

            console.log(`== Round ${roundNumber}`);
            const seed = poseidon2([roundRandomness, playerRandomness]);
            const [drawValues, drawIndices] = sampleN(
                seed,
                playerDeck,
                DRAW_SIZE
            );
            console.log(`- Draw:`, drawValues);
            console.log(`- Indices:`, drawIndices);
            const [moveDrawIdx, moveDeckIdx] = askValidMove(
                drawIndices,
                validMoves
            );
            console.log(
                `- Playing: ${drawValues[moveDrawIdx]} (index ${moveDeckIdx})`
            );

            await submitDrawProof(
                playerCommitment,
                roundRandomness,
                playerRandomness,
                moveDeckIdx
            );
        },
    });
}

async function playGame() {
    await listenForStartRound();

    [validMoves, playerDeck] = constructDeck();
    [playerRandomness, playerCommitment] = await commitRand();
}

playGame();
