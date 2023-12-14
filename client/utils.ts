import { groth16 } from "snarkjs";

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
    const { proof, publicSignals } = await groth16.fullProve(
        {
            playerCommitment: playerCommitment.toString(),
            roundRandomness: roundRandomness.toString(),
            playerRandomness: playerRandomness.toString(),
            cardPlayed: cardPlayed,
        },
        DRAW_WASM,
        DRAW_ZKEY
    );

    return exportCallDataGroth16(proof, publicSignals);
}
