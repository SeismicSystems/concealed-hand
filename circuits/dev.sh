#! /bin/bash

: '
  Boilerplate circuit compilation & smoke testing. Do not use in prod. Assumes
  naming convention: Outputs solidity verifier in ../contracts/src and proving 
  key in ./
'

PTAU=$1
UPPER_NAME="$(tr '[:lower:]' '[:upper:]' <<< ${NAME:0:1})${NAME:1}"

# Compile circuit
circom concealed-hand/concealed-hand.circom --r1cs --wasm

# Generate proving key
pnpm exec snarkjs groth16 setup concealed-hand.r1cs \
                               $PTAU \
                               concealed-hand.zkey

# Generate verifying key
pnpm exec snarkjs zkey export verificationkey concealed-hand.zkey \
                                             concealed-hand.vkey.json

# TODO: smoke test
# Compute witness, used as smoke test for circuit
# node concealed-hand_js/generate_witness.js \
#      concealed-hand_js/concealed-hand.wasm \
#      concealed-hand/concealed-hand.smoke.json \
#      concealed-hand.wtns

# Export solidity verifier
pnpm exec snarkjs zkey export solidityverifier concealed-hand.zkey \
                                              ConcealedHandVerifier.sol
sed -i '' -e 's/0.6.11;/0.8.13;/g' ConcealedHandVerifier.sol
mv ConcealedHandVerifier.sol ../contracts/src/ConcealedHandVerifier.sol

# Save proving key and witness generation script
mv concealed-hand_js/concealed-hand.wasm concealed-hand.zkey concealed-hand/

# Clean up
rm -rf concealed-hand.vkey.json concealed-hand.wtns concealed-hand_js/ concealed-hand.r1cs
