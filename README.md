# A demo for concealed hands in a FOCG

## The standard for FOC card games is open-hand play
Fully on-chain card games often work under the following setting. Each player brings in a public deck of cards $D_i$, where $i$ refers to the index of the player. Then, $n$ rounds proceed with the draws for each round seeded with a random value from a VRF. A round consists of the following steps:

2. The $j$'th round begins with each player assigned a hand $H_{ij} = draw(D_i, rround_j)$ based on the randomness $rround_j$ provided by the VRF. Here, $H_{ij} \subset D$ constitutes all actions the $i$'th player can take on the $j$'th round.
3. Each player chooses a card (or multiple) from $H_{ij}$ to represent their action for this round. 
4. Once actions are submitted by all players, game logic is executed.

Since $D$ is public going into the game, and $rround_{j}$ is public for every round, all players can compute $draw(D_i, rround_j)$ for all other players. This scenario of every player knowing the hands of every other player is referred to as open-hand play. 

## Concealing hands using entropy mixing

We can implement concealed hands using entropy mixing, a common pattern in cryptography that requires minimal engineering lift. Entropy mixing is jargon for sourcing randomness from multiple places. Two is sufficient for this use case.

The core idea is this. In the standard construction, all hands are public because $draw()$ is a function with inputs that are all public. We can conceal hands by making one of the function inputs known only to the respective user. This is done by using a seed that takes randomness from both the VRF (round randomness) and the player (player randomness). 

Only the player knows their random value, so only they know their hand. It's the same as each player shuffling their deck before the game starts. When the decks are drawn during each round, all players see which cards are drawn from which decks, but don't know the values due to the shuffle. Note that this is an imperfect analogy: seeing an ace of spades at index 2 for a player in one round does not mean it's at the same spot in the next round.

Here's the concrete change. Instead of obtaining a hand via $H_{ij} = draw(D_i, rround_j)$, we use $H_{ij} = draw(D_i, seed_{ij})$, where $seed_{ij} = Poseidon(rround_i, rplayer_j)$. $Poseidon$ is a zk-friendly hash function, meaning it's efficient to compute in circuits. The random value $rplayer_j$ is only known to the $j$'th player, which means $seed_{ij}$ is only known to the player. 

## Verifying player honesty for the shuffle

Now the only thing left to do is to verify that players don't cheat with their randomness. They shouldn't be able to see the round VRF output, then pick a random value that gets them a favorable shuffle. 

Players must commit to their randomness at the beginning of the game, before seeing any VRF outputs. This is done with a hiding commitment $commit_j = Poseidon(rplayer_j)$. The protocol can then verify that they stick to this committed value in two ways:

1. ZKP. Whenever a player puts down an action, they must submit a ZKP that asserts the statement "this card is in the draw consistent with the round randomness and my committed randomness".
2. Commit-Reveal. At the end of the game, the player can reveal their committed randomness, and the protocol can go back and replay all moves with this knowledge, confirming that all actions were within valid draws. Note that we can use $keccak()$ here for the commitment since there are no circuits involved.

Both have their costs and benefits. For the majority of cases, we strongly recommend going with #2. We've implemented both in this repository for completeness (lots of code repetition between the two). All moves are on-chain for a dummy card game and all proofs are real. 

This code is not audited and has zero test harness. It is not suited for production use.
