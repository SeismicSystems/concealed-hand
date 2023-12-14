RPC_URL=http://localhost:8545
DEV_PRIV_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

DEPLOY_ADDRESS=$(forge create src/DrawVerifier.sol:Groth16Verifier \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY \
    --save-address)

echo "Deployed contract address: $DEPLOY_ADDRESS"
