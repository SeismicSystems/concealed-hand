: '
  Run this script whenever you want to begin a new card game.
  '

RPC_URL=http://localhost:8545
DEV_PRIV_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

N_ROUNDS=3
DECK_SIZE=13

: '
  Deploy CardGame contract and save the deployment address.
  '
forge create src/CardGame.sol:CardGame \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY \
    --constructor-args $N_ROUNDS $DECK_SIZE > game_deploy_out.txt
GAME_ADDR=$(awk '/Deployed to:/ {print $3}' game_deploy_out.txt)

: '
  Write deployment details to a JSON for use in client.
  '
echo "{ 
    \"gameAddress\": \"$GAME_ADDR\" 
}" > ../out/deployment.json
rm game_deploy_out.txt
