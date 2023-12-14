// @ts-ignore
import { groth16 } from "snarkjs";
import {
    createPublicClient,
    createWalletClient,
    getContract,
    http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const DRAW_WASM: string = "../circuits/draw/draw.wasm";
const DRAW_ZKEY: string = "../circuits/draw/draw.zkey";

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

export type Groth16FullProveResult = {
    proof: Groth16Proof;
    publicSignals: any;
};

export type Groth16Proof = {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
    protocol: string;
    curve: string;
};

export type Groth16ProofCalldata = {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
    input: string[];
};

export async function exportCallDataGroth16(
    prf: Groth16Proof,
    pubSigs: any
): Promise<Groth16ProofCalldata> {
    const proofCalldata: string = await groth16.exportSolidityCallData(
        prf,
        pubSigs
    );
    const argv: string[] = proofCalldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x: string) => BigInt(x).toString());
    return {
        a: argv.slice(0, 2) as [string, string],
        b: [
            argv.slice(2, 4) as [string, string],
            argv.slice(4, 6) as [string, string],
        ],
        c: argv.slice(6, 8) as [string, string],
        input: argv.slice(8),
    };
}

export async function proveHonestSelect(
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

    let proverRes: Groth16FullProveResult | null;
    let proverErr;
    [proverRes, proverErr] = await handleAsync(
        groth16.fullProve(groth16Inputs, DRAW_WASM, DRAW_ZKEY)
    );
    if (!proverRes || proverErr) {
        console.error(
            "Error proving draw ZKP with input signals",
            groth16Inputs
        );
        process.exit(1);
    }

    let exportRes, exportErr;
    // return exportCallDataGroth16(proverRes.proof, proverRes.publicSignals);
    [exportRes, exportErr] = await handleAsync(
        exportCallDataGroth16(proverRes.proof, proverRes.publicSignals)
    );
    if (!exportRes || exportErr) {
        console.error("Error formatting proof and public signals");
        process.exit(1);
    }
    return exportRes;
}

/*
 * Contract values
 */
const privateKey =
    process.argv[2] === "SPADES"
        ? "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        : "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(),
});

const publicClient = createPublicClient({
    chain: foundry,
    transport: http(),
});

// const nStates = getContract({
//     abi,
//     address: worldAddress,
//     walletClient,
//     publicClient,
// });
