# A demo for concealed hands in a FOCG

## The standard for FOC card games is open-hand play
Fully on-chain card games often work under the following setting. Each player brings in a public deck of cards $D_i$ (where $i$ refers to the index of the player). Then, $n$ rounds proceed with each round seeded with a random value from a VRF. A round consists of the following steps:

2. The $j$'th round begins with each player assigned a hand $H_{ij} = draw(D_i, rround_j)$ based on the randomness $rround_j$ provided by the VRF. Here, $H_{ij} \subset D$ constitutes all actions the $i$'th player can take on the $j$'th round.
3. Each player chooses a card (or multiple) from $H_{ij}$ to represent their action for this round. 
4. Once actions are submitted by all players, game logic is executed to affect state given the batch of actions.

Since $D$ is public going into the game, and $rround_{j}$ is public for every round, all players can compute $draw(D_i, rround_j)$ for all other players. This scenario of every player knowing the hands of every other player is referred to as open-hand play. 

## Two methods

- for concealed hands under this setting, minimal engineering lift
