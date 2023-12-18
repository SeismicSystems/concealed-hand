// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./DummyVRF.sol";

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

    modifier validOpening(Player storage player, uint256 preimage) {
        require(
            uint256(keccak256(abi.encodePacked(preimage))) == player.randCommit,
            "Preimage must match up to commitment sent in before game."
        );
        _;
    }

    modifier gameFinished() {
        require(
            currentRound >= nRounds,
            "Cannot reveal player randomness till game is over."
        );
        _;
    }

    function sampleN(uint256 seed) public view returns (uint256[] memory) {
        uint256[] memory indices = new uint256[](deckSize);
        for (uint256 i = 0; i < deckSize; i++) {
            indices[i] = i;
        }
        uint256[] memory permuted = permutate(seed, indices);
        uint256[] memory permutedTrunc = new uint256[](drawSize);
        for (uint256 i = 0; i < drawSize; i++) {
            permutedTrunc[i] = permuted[i];
        }
        return permutedTrunc;
    }

    function permutate(
        uint256 seed,
        uint256[] memory arr
    ) public pure returns (uint256[] memory) {
        uint256[] memory arrCopy = new uint256[](arr.length);
        for (uint i = 0; i < arr.length; i++) {
            arrCopy[i] = arr[i];
        }
        seed = seed & ((1 << 250) - 1);
        for (uint i = arrCopy.length; i > 0; i--) {
            uint r = uint(seed % i);
            uint temp = arrCopy[i - 1];
            arrCopy[i - 1] = arrCopy[r];
            arrCopy[r] = temp;
            seed = (seed - r) / i;
        }
        return arrCopy;
    }

    function arrayContains(
        uint256 element,
        uint256[] memory arr
    ) public pure returns (bool) {
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == element) {
                return true;
            }
        }
        return false;
    }

    function revealRand(
        Player storage player,
        uint256 preimage
    ) internal validOpening(player, preimage) gameFinished {
        for (uint i = 0; i < player.moves.length; i++) {
            Move memory move = player.moves[i];
            bytes32 seed = keccak256(
                abi.encodePacked(vrf.getRand(i), preimage)
            );
            uint256[] memory draw = sampleN(uint256(seed));
            require(
                arrayContains(move.cardIdx, draw),
                "Found a move not included in a draw consistent with player randomness."
            );
        }
        emit VerifiedDraws(player.addr);
    }

    function revealPlayerA(uint256 preimage) external {
        revealRand(A, preimage);
    }

    function revealPlayerB(uint256 preimage) external {
        revealRand(B, preimage);
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
