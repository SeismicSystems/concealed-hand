import { encodePacked, keccak256 } from "viem";
import * as readlineSync from "readline-sync";
import crypto from "crypto";

import { CARDS, DUMMY_VRF } from "./lib/constants";
import {
    EventABIs,
    contractInterfaceSetup,
    computeRand,
    handleAsync,
    sampleN,
} from "./lib/utils";

const N_ROUNDS = 3;
const DRAW_SIZE = 5;

let suit, privKey;
let publicClient, contract;

/*
 * A player's deck is all 13 cards in their suit. A move is an index in the
 * range [0, 13).
 */
function constructDeck(): [string[], string[]] {
    const validMoves = Array.from({ length: DRAW_SIZE }, (_, i) =>
        i.toString()
    );
    const playerDeck = CARDS.map((card) => {
        return `${suit}-${card}`;
    });
    return [validMoves, playerDeck];
}

/*
 * Players must commit to their chosen randomness on-chain before the game
 * begins.
 */
async function sendRandCommitment(
    playerRandomness: bigint,
    randCommitment: bigint
): Promise<[bigint, bigint]> {
    const contractCommitFunc =
        suit === "SPADES"
            ? contract.write.claimPlayerA
            : contract.write.claimPlayerB;

    let [res, err] = await handleAsync(contractCommitFunc([randCommitment]));
    if (!res || err) {
        console.error("Error committing to randomness on-chain:", err);
        process.exit(1);
    }

    return [playerRandomness, randCommitment];
}

/*
 * Publish the chosen card (action) to the chain.
 */
async function submitMove(
    playerCommitment: bigint,
    roundRandomness: bigint,
    playerRandomness: bigint,
    cardPlayed: number
) {
    let [res, err] = await handleAsync(contract.write.playCard([cardPlayed]));
    if (!res || err) {
        console.error("ERROR: Could not play card:", cardPlayed);
        process.exit(1);
    }
}

/*
 * Ask for player's move via CLI.
 */
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

/*
 * Once all rounds have concluded, player reveals randomness so the chain can
 * verify their claimed draws.
 */
async function checkGameEnd(
    roundNumber: number,
    nRounds: number,
    playerRandomness: bigint
) {
    if (roundNumber <= nRounds) {
        return;
    }

    console.log("== Game ended, revealing randomness.");
    let [res, err] = await handleAsync(
        contract.write.revealRand([playerRandomness])
    );
    if (!res || err) {
        console.error("Error revealing randomness on-chain:", err);
        process.exit(1);
    }
    console.log("==");

    process.exit(0);
}

/*
 * A round consists of showing the player their draw and returning their chosen
 * move.
 */
function playRound(
    playerDeck: string[],
    drawSize: number,
    roundRandomness: bigint,
    playerRandomness: bigint,
    validMoves: string[]
): number {
    const seed = BigInt(
        keccak256(
            encodePacked(
                ["uint256", "uint256"],
                [roundRandomness, playerRandomness]
            )
        )
    );
    const [drawValues, drawIndices] = sampleN(seed, playerDeck, drawSize);
    console.log(`- Your draw:`, drawValues);

    const [moveDrawIdx, moveDeckIdx] = askValidMove(drawIndices, validMoves);
    console.log(`- Playing: ${drawValues[moveDrawIdx]}`);

    return moveDeckIdx;
}

/*
 * Participate whenever the contract emits an event signaling that a round has
 * begun.
 */
function attachGameLoop(
    playerDeck: string[],
    nRounds: number,
    drawSize: number,
    playerCommitment: bigint,
    playerRandomness: bigint,
    validMoves: string[]
) {
    publicClient.watchEvent({
        event: EventABIs["StartRound"],
        strict: true,
        onLogs: (logs: [any]) => {
            logs.forEach(async (log) => {
                const roundNumber = Number(log.args.roundIndex) + 1;
                const roundRandomness = DUMMY_VRF[roundNumber - 1];
                await checkGameEnd(roundNumber, nRounds, playerRandomness);

                console.log(`== Round ${roundNumber}`);
                let cardPlayed = playRound(
                    playerDeck,
                    drawSize,
                    roundRandomness,
                    playerRandomness,
                    validMoves
                );
                await submitMove(
                    playerCommitment,
                    roundRandomness,
                    playerRandomness,
                    cardPlayed
                );
                console.log("==");
            });
        },
    });
}

(async () => {
    suit = process.argv[2];
    privKey = process.argv[3];
    if (!suit || !privKey) {
        throw new Error("Please specify suit and dev private key in CLI.");
    }

    let [validMoves, playerDeck] = constructDeck();
    [publicClient, contract] = contractInterfaceSetup(privKey);
    let [playerRandomness, playerCommitment] = computeRand();
    attachGameLoop(
        playerDeck,
        N_ROUNDS,
        DRAW_SIZE,
        playerCommitment,
        playerRandomness,
        validMoves
    );
    sendRandCommitment(playerRandomness, playerCommitment);
})();
