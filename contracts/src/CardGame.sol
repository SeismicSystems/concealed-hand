// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./DummyVRF.sol";

/*
 * Interface for the solidity verifier generated by snarkjs.
 */
interface IDrawVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external view returns (bool);
}

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
    struct Groth16Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    Player A;
    Player B;
    uint256 nRounds;
    uint256 currentRound;
    uint256 deckSize;
    DummyVRF vrf;
    IDrawVerifier drawVerifier;

    event StartRound(uint256 roundIndex);
    event PlayerMove(uint256 roundIndex, address addr, uint256 cardIdx);
    event GameEnd();

    constructor(
        uint256 _nRounds,
        uint256 deckSize_,
        address _drawVerifierAddr
    ) {
        nRounds = _nRounds;
        deckSize = deckSize_;

        vrf = new DummyVRF();
        drawVerifier = IDrawVerifier(_drawVerifierAddr);
    }

    function attemptStartGame() internal {
        if (A.addr != address(0) && B.addr != address(0)) {
            emit StartRound(currentRound);
        }
    }

    function claimPlayer(Player storage player, uint256 randCommit_) internal {
        require(player.addr == address(0), "Player has already been claimed.");
        player.randCommit = randCommit_;
        player.addr = msg.sender;
        for (uint i = 0; i < nRounds; i++) {
            player.moves.push(Move(false, 0));
        }
        attemptStartGame();
    }

    function claimPlayerA(uint256 randCommit_) external {
        claimPlayer(A, randCommit_);
    }

    function claimPlayerB(uint256 randCommit_) external {
        claimPlayer(B, randCommit_);
    }

    function getPlayer() internal view returns (Player storage) {
        if (msg.sender == A.addr) {
            return A;
        }
        if (msg.sender == B.addr) {
            return B;
        }
        revert("Sender is not registered for this game.");
    }

    function attemptIncrementRound() internal {
        if (
            A.moves[currentRound].hasPlayed && B.moves[currentRound].hasPlayed
        ) {
            currentRound++;
            emit StartRound(currentRound);
        }
    }

    function attemptEndGame() internal {
        if (currentRound >= nRounds) {
            emit GameEnd();
        }
    }

    function playCard(
        uint256 cardIdx,
        Groth16Proof memory proof
    ) external openTurn drawProofVerifies(cardIdx, proof) {
        Player storage player = getPlayer();
        player.moves[currentRound].hasPlayed = true;
        player.moves[currentRound].cardIdx = cardIdx;
        emit PlayerMove(currentRound, player.addr, cardIdx);
        attemptIncrementRound();
        attemptEndGame();
    }

    modifier openTurn() {
        require(currentRound < nRounds, "Game is already over.");
        require(
            !getPlayer().moves[currentRound].hasPlayed,
            "Already made a move this round."
        );
        _;
    }

    modifier drawProofVerifies(uint256 cardIdx, Groth16Proof memory proof) {
        require(
            drawVerifier.verifyProof(
                proof.a,
                proof.b,
                proof.c,
                [getPlayer().randCommit, vrf.getRand(currentRound), cardIdx]
            ),
            "Proof verification failed."
        );
        _;
    }
}
