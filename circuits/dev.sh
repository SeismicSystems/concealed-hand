#! /bin/bash

: '
  Boilerplate circuit compilation & smoke testing. Do not use in prod. Outputs 
  solidity verifier in ../contracts/src and proving key + witness gen in out/
  '

PTAU=$1

# Compile circuit
circom draw/draw.circom --r1cs --wasm

# Generate proving key
pnpm exec snarkjs groth16 setup draw.r1cs \
                               $PTAU \
                               draw.zkey

# Generate verifying key
pnpm exec snarkjs zkey export verificationkey draw.zkey \
                                             draw.vkey.json

# Compute witness, used as smoke test for circuit
node draw_js/generate_witness.js \
     draw_js/draw.wasm \
     draw/draw.smoke.json \
     draw.wtns

# Export solidity verifier
pnpm exec snarkjs zkey export solidityverifier draw.zkey \
                                              DrawVerifier.sol
sed -i '' -e 's/0.6.11;/0.8.13;/g' DrawVerifier.sol
mv DrawVerifier.sol ../contracts/src/DrawVerifier.sol

# Save proving key and witness generator
mv draw_js/draw.wasm draw.zkey draw/out/

# Clean up
rm -rf draw.vkey.json draw.wtns draw_js/ draw.r1cs
