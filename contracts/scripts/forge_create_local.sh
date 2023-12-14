# Set env variables 
source ../../.env

# Deploy contract to local chain
forge create src/Draw.sol:Draw \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY \
