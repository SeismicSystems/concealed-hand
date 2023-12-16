// @ts-ignore
import { groth16 } from "snarkjs";
import { poseidon1, poseidon2 } from "poseidon-lite";
import * as readlineSync from "readline-sync";

import { CARDS, DUMMY_VRF, DRAW_WASM, DRAW_ZKEY } from "./lib/constants";
import { Groth16FullProveResult, Groth16ProofCalldata } from "./lib/types";
import {
    EventABIs,
    contractInterfaceSetup,
    exportCallDataGroth16,
    handleAsync,
    sampleN,
    uniformBN128Scalar,
} from "./lib/utils";

const N_ROUNDS = 3;
const DRAW_SIZE = 5;

/*
  * A player's deck is all 13 cards in their suit. A move is an index in the  
  * range [0, 13).
  */
function constructDeck(suit: string): [string[], string[]] {
    const validMoves = Array.from({ length: DRAW_SIZE }, (_, i) =>
        i.toString()
    );
    const playerDeck = CARDS.map((card) => {
        return `${suit}-${card}`;
    });
    return [validMoves, playerDeck];
}

/*
 * Samples a random value in BN128's scalar field and its corresponding 
 * commitment. 
 */
function computeRand(): [bigint, bigint] {
    console.log("== Sampling player randomness");
    let playerRandomness = uniformBN128Scalar();
    let randCommitment = poseidon1([playerRandomness]);
    console.log("- Random value:", playerRandomness);
    console.log("- Commitment:", randCommitment);
    console.log("==");
    return [playerRandomness, randCommitment];
}

/*
 * Players must commit to their chosen randomness on-chain before the game 
 * begins.
 */
async function sendRandCommitment(
    contract: any,
    suit: string,
    playerRandomness: bigint,
    randCommitment: bigint
): Promise<[bigint, bigint]> {
    const contractCommitFunc =
        suit === "SPADES"
            ? contract.write.claimPlayerA
            : contract.write.claimPlayerB;

    let res, err;
    [res, err] = await handleAsync(contractCommitFunc([randCommitment]));
    if (!res || err) {
        console.error("Error committing to randomness onchain:", err);
        process.exit(1);
    }

    return [playerRandomness, randCommitment];
}

/*
 * Computes a ZKP that attests to the statement "this card is in the draw 
 * consistent with the round randomness and my committed randomness".
 */
async function proveHonestSelect(
    playerCommitment: bigint,
    roundRandomness: bigint,
    playerRandomness: bigint,
    cardPlayed: number
): Promise<Groth16ProofCalldata> {
    const groth16Inputs = {
        playerCommitment: playerCommitment.toString(),
        roundRandomness: roundRandomness.toString(),
        playerRandomness: playerRandomness.toString(),
        cardPlayed: cardPlayed,
    };

    const startTime = Date.now();
    let [proverRes, proverErr]: [Groth16FullProveResult | null, any] =
        await handleAsync(
            groth16.fullProve(groth16Inputs, DRAW_WASM, DRAW_ZKEY)
        );
    const endTime = Date.now();
    console.log(`- Time it took to generate ZKP: ${endTime - startTime}ms`);
    if (!proverRes || proverErr) {
        console.error(
            "ERROR: Could not generate draw ZKP for input signals:",
            groth16Inputs
        );
        process.exit(1);
    }

    let exportRes, exportErr;
    [exportRes, exportErr] = await handleAsync(
        exportCallDataGroth16(proverRes.proof, proverRes.publicSignals)
    );
    if (!exportRes || exportErr) {
        console.error("ERROR: Could not format proof:", proverRes);
        process.exit(1);
    }
    return exportRes;
}

/*
 * Publish the chosen card (action) to the chain, along with a ZKP that it is
 * part of the round's draw. 
 */
async function submitMove(
    contract: any,
    playerCommitment: bigint,
    roundRandomness: bigint,
    playerRandomness: bigint,
    cardPlayed: number
) {
    const proof = await proveHonestSelect(
        playerCommitment,
        roundRandomness,
        playerRandomness,
        cardPlayed
    );

    let res, err;
    [res, err] = await handleAsync(
        contract.write.playCard([cardPlayed, proof])
    );
    if (!res || err) {
        console.error("ERROR: Could not submit move:", {
            playerCommitment: playerCommitment.toString(),
            roundRandomness: roundRandomness.toString(),
            playerRandomness: playerRandomness.toString(),
            cardPlayed: cardPlayed,
        });
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
 * Terminates the program if the game has ended.
 */
function checkGameEnd(roundNumber: number, nRounds: number) {
    if (roundNumber > nRounds) {
        console.log("Game has concluded.");
        process.exit(0);
    }
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
    const seed = poseidon2([roundRandomness, playerRandomness]);
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
    publicClient: any,
    contract: any,
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
                checkGameEnd(roundNumber, nRounds);

                console.log(`== Round ${roundNumber}`);
                let cardPlayed = playRound(
                    playerDeck,
                    drawSize,
                    roundRandomness,
                    playerRandomness,
                    validMoves
                );
                await submitMove(
                    contract,
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
    const suit = process.argv[2], privKey = process.argv[3];
    if (!suit || !privKey) {
        throw new Error("Please specify suit and dev private key in CLI.");
    }

    let [validMoves, playerDeck] = constructDeck(suit);
    let [publicClient, contract] = contractInterfaceSetup(privKey);
    let [playerRandomness, playerCommitment] = computeRand();
    attachGameLoop(
        publicClient,
        contract,
        playerDeck,
        N_ROUNDS,
        DRAW_SIZE,
        playerCommitment,
        playerRandomness,
        validMoves
    );
    sendRandCommitment(contract, suit, playerRandomness, playerCommitment);
})();
