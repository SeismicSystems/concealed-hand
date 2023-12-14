# A demo for concealed hands in a FOCG

## The standard for FOC card games is open-hand play
Fully on-chain card games often work under the following setting. Each player brings in a public deck of cards $D_i$ (where $i$ refers to the index of the player). Then, $n$ rounds proceed with each round seeded with a random value from a VRF. A round consists of the following steps:

2. The $j$'th round begins with each player assigned a hand $H_{ij} = draw(D_i, rround_j)$ based on the randomness $rround_j$ provided by the VRF. Here, $H_{ij} \subset D$ constitutes all actions the $i$'th player can take on the $j$'th round.
3. Each player chooses a card (or multiple) from $H_{ij}$ to represent their action for this round. 
4. Once actions are submitted by all players, game logic is executed to affect state given the batch of actions.

Since $D$ is public going into the game, and $rround_{j}$ is public for every round, all players can compute $draw(D_i, rround_j)$ for all other players. This scenario of every player knowing the hands of every other player is referred to as open-hand play. 

## Concealing hands using entropy mixing

We can implement concealed hands using entropy mixing, a common pattern in cryptography that requires minimal engineering lift. Entropy mixing is jargon for sourcing randomness from multiple places. Two is sufficient for this use case.

The core idea is this. In the standard construction, all hands are public because $draw()$ is a function with inputs that are all public. We can conceal a hand by making one of the inputs known only to the respective user. This is done by using a seed that takes randomness from both the VRF (round randomness) and the player (player randomness). 

Only you (the player) know your random value, so only you know your hand. It's the same as you shuffling your deck before the game starts. Then, when the decks are drawn from during each round, all players see which cards you draw from your deck, but don't know the values due to the shuffle. Note that this is an imperfect analogy, but the concept is there.

Here's the concrete change. Instead of obtaining a hand via $H_{ij} = draw(D_i, rround_j)$, we use $H_{ij} = draw(D_i, seed_{ij})$, where $seed_{ij} = Poseidon(rround_i, rplayer_j)$. $Poseidon$ is a zk-friendly hash function, meaning it's efficient to compute in circuits. Only the $j$'th player knows $rplayer_j$, so $seed_{ij}$ is also only known to the player. 

## Verifying player honesty for the shuffle

Now the only thing left to do is to verify that players don't cheat with their randomness. They shouldn't be able to see the round VRF output, then pick a random value that gets them a favorable shuffle. 

Players must commit to their randomness at the beginning of the game, before seeing any VRF outputs. This is done with a hiding commitment $commit_j = Poseidon(rplayer_j)$. The protocol can then verify that they stick to this committed value in two ways:

1. Whenever a player puts down an action, they must submit a ZKP that asserts the statement "this card is in the draw consistent with the round randomness and my committed randomness".
2. At the end of the game, the player can reveal their committed randomness, and the protocol can go back and replay all moves with this knowledge, confirming that all actions were within valid draws. 

Both have their costs and benefits. For the majority of cases, we strongly recommend going with #2. We've implemented both in this repository for completeness.
