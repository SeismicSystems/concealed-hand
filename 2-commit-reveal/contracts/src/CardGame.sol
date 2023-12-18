// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./DummyVRF.sol";
import "./Utils.sol";

contract CardGame {
    struct Move {
        bool hasPlayed;
        uint256 cardIdx;
    }
    struct Player {
        uint256 randCommit;
        address addr;
        Move[] moves;
    }

    Player public A;
    Player public B;
    uint256 public nRounds;
    uint256 public currentRound;
    uint256 public deckSize;
    uint256 public drawSize;
    DummyVRF public vrf;

    event StartRound(uint256 roundIndex);
    event PlayerMove(uint256 roundIndex, address addr, uint256 cardIdx);
    event GameEnd();
    event VerifiedDraws(address playerAddr);

    constructor(uint256 _nRounds, uint256 deckSize_, uint256 drawSize_) {
        nRounds = _nRounds;
        deckSize = deckSize_;
        drawSize = drawSize_;

        vrf = new DummyVRF();
    }

    /*
     * Game starts once both player A and player B roles have been claimed by
     * wallets.
     */
    function attemptStartGame() internal {
        if (A.addr != address(0) && B.addr != address(0)) {
            emit StartRound(currentRound);
        }
    }

    /*
     * A wallet can claim a role in the game by sending in a commitment to their
     * randomness. Moves are initialized to (false, 0) for all rounds.
     */
    function claimPlayer(Player storage player, uint256 randCommit_) internal {
        require(player.addr == address(0), "Player has already been claimed.");
        player.randCommit = randCommit_;
        player.addr = msg.sender;
        for (uint i = 0; i < nRounds; i++) {
            player.moves.push(Move(false, 0));
        }
        attemptStartGame();
    }

    /*
     * Claim the role of Player A.
     */
    function claimPlayerA(uint256 randCommit_) external {
        claimPlayer(A, randCommit_);
    }

    /*
     * Claim the role of Player B.
     */
    function claimPlayerB(uint256 randCommit_) external {
        claimPlayer(B, randCommit_);
    }

    /*
     * Which player sent the current transaction.
     */
    function getPlayer() internal view returns (Player storage) {
        if (msg.sender == A.addr) {
            return A;
        }
        if (msg.sender == B.addr) {
            return B;
        }
        revert("Sender is not registered for this game.");
    }

    /*
     * A new round starts once both players have submitted moves for the current
     * round.
     */
    function attemptIncrementRound() internal {
        if (
            A.moves[currentRound].hasPlayed && B.moves[currentRound].hasPlayed
        ) {
            currentRound++;
            emit StartRound(currentRound);
        }
    }

    /*
     * Game ends once all the rounds are completed.
     */
    function attemptEndGame() internal {
        if (currentRound >= nRounds) {
            emit GameEnd();
        }
    }

    /*
     * Checks whether the claimed preimage is the valid opening to the player's
     * commitment.
     */
    modifier validOpening(Player storage player, uint256 preimage) {
        require(
            uint256(keccak256(abi.encodePacked(preimage))) == player.randCommit,
            "Preimage must match up to commitment sent in before game."
        );
        _;
    }

    /*
     * Checks whether all rounds have concluded.
     */
    modifier gameFinished() {
        require(
            currentRound >= nRounds,
            "Cannot reveal player randomness till game is over."
        );
        _;
    }

    /*
     * Players open their random commitments at the end of the game. Contract
     * checks that all their moves were consistent with this randomness.
     */
    function revealRand(
        uint256 preimage
    ) external validOpening(getPlayer(), preimage) gameFinished {
        Player memory player = getPlayer();
        for (uint i = 0; i < player.moves.length; i++) {
            Move memory move = player.moves[i];
            bytes32 seed = keccak256(
                abi.encodePacked(vrf.getRand(i), preimage)
            );
            uint256[] memory draw = Utils.sampleN(
                uint256(seed),
                deckSize,
                drawSize
            );
            require(
                Utils.arrayContains(move.cardIdx, draw),
                "Found a move inconsistent with player randomness."
            );
        }
        emit VerifiedDraws(player.addr);
    }

    /*
     * No game logic is implemented for this demo card game. Playing a card
     * only saves it as a move.
     */
    function playCard(uint256 cardIdx) external openTurn {
        Player storage player = getPlayer();
        player.moves[currentRound].hasPlayed = true;
        player.moves[currentRound].cardIdx = cardIdx;
        emit PlayerMove(currentRound, player.addr, cardIdx);
        attemptIncrementRound();
        attemptEndGame();
    }

    /*
     * A player can move in this round if 1) the game is still going and 2) they
     * haven't already moved.
     */
    modifier openTurn() {
        require(currentRound < nRounds, "Game is already over.");
        require(
            !getPlayer().moves[currentRound].hasPlayed,
            "Already made a move this round."
        );
        _;
    }
}
