: '
  Run this script whenever you want to begin a new card game.
  '

RPC_URL=http://localhost:8545
DEV_PRIV_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

N_ROUNDS=3
DECK_SIZE=13
DRAW_SIZE=5

: '
  Deploy Utils library and save the deployment address.
  '
forge create src/Utils.sol:Utils \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY > utils_deploy_out.txt
UTILS_ADDR=$(awk '/Deployed to:/ {print $3}' utils_deploy_out.txt)

: '
  Deploy CardGame contract and save the deployment address.
  '
forge create src/CardGame.sol:CardGame \
    --rpc-url $RPC_URL \
    --private-key $DEV_PRIV_KEY \
    --libraries src/Utils.sol:Utils:$UTILS_ADDR \
    --constructor-args $N_ROUNDS $DECK_SIZE $DRAW_SIZE > game_deploy_out.txt
GAME_ADDR=$(awk '/Deployed to:/ {print $3}' game_deploy_out.txt)

: '
  Write deployment details to a JSON for use in client.
  '
echo "{ 
    \"utilsAddress\": \"$UTILS_ADDR\", 
    \"gameAddress\": \"$GAME_ADDR\" 
}" > ../out/deployment.json
rm utils_deploy_out.txt game_deploy_out.txt
