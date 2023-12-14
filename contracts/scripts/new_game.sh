RPC_URL=http://localhost:8545
DEV_PRIV_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

N_ROUNDS=3
DECK_SIZE=13

forge create src/DrawVerifier.sol:Verifier \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY > verifier_deploy_out.txt

DRAW_VERIF_ADDR=$(awk '/Deployed to:/ {print $3}' verifier_deploy_out.txt)
forge create src/CardGame.sol:CardGame \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY \
    --constructor-args $N_ROUNDS $DECK_SIZE $DRAW_VERIF_ADDR >  game_deploy_out.txt
GAME_ADDR=$(awk '/Deployed to:/ {print $3}' game_deploy_out.txt)

echo "{ 
    \"drawVerifierAddress\": \"$DRAW_VERIF_ADDR\", 
    \"gameAddress\": \"$GAME_ADDR\" 
}" > ../out/deployment.json
rm verifier_deploy_out.txt game_deploy_out.txt
