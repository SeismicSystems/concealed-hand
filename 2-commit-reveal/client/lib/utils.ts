// @ts-ignore
import { groth16 } from "snarkjs";
import {
    Address,
    createPublicClient,
    createWalletClient,
    getContract,
    http,
    keccak256,
    parseAbiItem,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import crypto from "crypto";

import CardGameABI from "../../contracts/out/CardGame.sol/CardGame.json" assert { type: "json" };
import deployment from "../../contracts/out/deployment.json" assert { type: "json" };
import { BN128_SCALAR_MOD } from "./constants";
import { Groth16Proof, Groth16ProofCalldata } from "./types";

export const EventABIs = {
    StartRound: parseAbiItem("event StartRound(uint256 roundIndex)"),
    PlayerMove: parseAbiItem(
        "event PlayerMove(uint256 roundIndex, address addr, uint256 cardIdx, uint256[2] proofa, uint256[2][2] proofb, uint256[2] proofc)"
    ),
    GameEnd: parseAbiItem("event GameEnd()"),
};

/*
 * Sets up a contract interface with Viem.
 */
export function contractInterfaceSetup(privKey: string): [any, any] {
    const account = privateKeyToAccount(`0x${privKey}`);
    const walletClient = createWalletClient({
        account,
        chain: foundry,
        transport: http(),
    });
    const publicClient = createPublicClient({
        chain: foundry,
        transport: http(),
    });
    const contract = getContract({
        abi: CardGameABI.abi,
        address: deployment.gameAddress as Address,
        walletClient,
        publicClient,
    });
    return [publicClient, contract];
}

/*
 * Wrapper for error handling for promises.
 */
export async function handleAsync<T>(
    promise: Promise<T>
): Promise<[T, null] | [null, any]> {
    try {
        const data = await promise;
        return [data, null];
    } catch (error) {
        return [null, error];
    }
}

/*
 * Samples a random 256 bit value computes its keccak hash (the commitment).
 */
export function computeRand(): [bigint, bigint] {
    console.log("== Sampling player randomness");
    let playerRandomness = BigInt(
        `0x${crypto.randomBytes(32).toString("hex")}`
    );
    let randCommitment = BigInt(
        keccak256(`0x${playerRandomness.toString(16)}`)
    );
    console.log("- Random value:", playerRandomness);
    console.log("- Commitment:", randCommitment);
    console.log("==");
    return [playerRandomness, randCommitment];
}

/*
 * Sample <sz> values from an array by permuting it then taking the first <sz>
 * elements. 
 */
export function sampleN(
    seed: bigint,
    arr: string[],
    sz: number
): [string[], number[]] {
    const indices = [...Array(arr.length).keys()];
    const permuteTrunc = permutate(seed, indices).slice(0, sz);
    return [permuteTrunc.map((idx) => arr[idx]), permuteTrunc];
}

/*
 * Permutate an array using entropy provided by <seed>. Implementation from 
 * Jordi Baylina @ www.github.com/jbaylina/random_permute/blob/main/test/test.js
 */
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
