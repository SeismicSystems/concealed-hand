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
2. Commit-Reveal. The player can open their commitment (tell the chain what their random value is) at the end of the game. Then, the protocol can go back and replay all moves with this knowledge, confirming that all actions were within valid draws. Note that we can use $keccak()$ here for the commitment since there are no circuits involved.

Both have their costs and benefits. For the majority of cases, we strongly recommend going with #2. We've implemented both in this repository for completeness (lots of code repetition between the two). 

## Running the demo
> This code is not audited and has no test harness. It is not suited for production use.

The ZKP (`1-zkp/`) and commit-reveal (`2-commit-reveal`) variants share similar setup and run instructions. The intent is for developers to explore both implementations separately. 

We have two system dependencies: [foundry](https://book.getfoundry.sh/reference/forge/forge-install) and [circom](https://docs.circom.io/getting-started/installation/). Install both before beginning. We use `pnpm` as our package manager. We did not take the time to containerize this demo, so there may be a few edge dependencies that need to be installed as well. Overall, so it should be a quick process to run since we don't depend on much.

In your terminal enter `1-zkp/circuits/`. Run the below commands.
```
pnpm install
pnpm run dev
```
This is the only difference in setup between the two variants. The following steps will take you through the demo for one of the variants. Steps for the other are the same.

You need 4 terminals to run this demo. In the first terminal, run the command below to start your local chain.
```
anvil
```

In the second terminal, go to `contracts/scripts`. Run the command below to deploy a contract and start a new game. 
```
bash new_game.sh
```
Now use this terminal to go into `client/`. Run the command below to log the contract's event transcript as the game progresses.
```
pnpm install
pnpm run listen
```

The third terminal will be used for *Player A*. Run the command below.
```
pnpm run devA
```

The fourth terminal will be used for *Player B*. Run the command below
```
pnpm run devB
```

That's it. Follow the instructions in the game CLI and observe what's happening in the contract using your "listening" terminal (the second one).

All moves are on-chain for a dummy card game and all proofs are real. The default game is set to go for 3 rounds.

Here's a sample of the transcript you get in your listening terminal for the ZKP variant.
```
{ eventName: 'StartRound', args: { roundIndex: 0n } }
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 0n,
    addr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    cardIdx: 9n,
    proofa: [
      3205794790226169543371735889728795135478815224849467441940467567315768267660n,
      14807600452586920726014189067975351922404767018783430458669740336328331529007n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      11785546044887514056974700608959631168566991167493376969166808733920681484174n,
      20577126641217928064570181542117900658746464105555250669918237876165319558072n
    ]
  }
}
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 0n,
    addr: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    cardIdx: 4n,
    proofa: [
      13799750814625551679447968402278919892543784461081997693314299140548923339389n,
      2035348593730510689480965882961824376148900610652314309436053929683805889074n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      21565670293408013820174727719801986477431768157251791443931045381043033033396n,
      14040459471641970785856525429865980537166010996321602308979580788368922143438n
    ]
  }
}
{ eventName: 'StartRound', args: { roundIndex: 1n } }
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 1n,
    addr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    cardIdx: 4n,
    proofa: [
      20036932177724078220146740404069474530763646037696294463184477041378193818902n,
      18539809882005104742051231623650151694219261538492416659660510115692803387375n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      13140511031394261861448174921794962517863548678000878669743862134673274898705n,
      21169482813076677793023309599596442946228048247813525512645144399697832104184n
    ]
  }
}
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 1n,
    addr: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    cardIdx: 4n,
    proofa: [
      7972164225591469871868150952939530993597647464592698365463096735747944289020n,
      9390248048009709946320327573515293709873157145861655966746520758319126902570n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      21084044275926781003663096950138057610805348802640233274082620618121377121800n,
      20509889599955429540528549293531401950105844331172034960680935791622484734979n
    ]
  }
}
{ eventName: 'StartRound', args: { roundIndex: 2n } }
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 2n,
    addr: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    cardIdx: 0n,
    proofa: [
      6561591661181739497758512141464692845259018638483862465645960508280950242150n,
      10281074493121049003623691452554628126697146604869002632549504400401420814149n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      10379428734408448944505818950409945703421404009378377757941359844447040125183n,
      13435763310049947535064521687153424064705840025148830610301379800937979925068n
    ]
  }
}
{
  eventName: 'PlayerMove',
  args: {
    roundIndex: 2n,
    addr: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    cardIdx: 11n,
    proofa: [
      18172793102695789826518848422825047057393030412727216090056986824486070900537n,
      14641394174975338876809462768386021566330338887532896014207522574840120532543n
    ],
    proofb: [ [Array], [Array] ],
    proofc: [
      19868045306629465753159437278224860419925275479998641844982061045125779828328n,
      11254165046557667296494524522496492287569019334780282147815191000762957838913n
    ]
  }
}
{ eventName: 'StartRound', args: { roundIndex: 3n } }
{ eventName: 'GameEnd', args: undefined }
```
