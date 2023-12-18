// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library Utils {
    /*
     * Sample <drawSize> values from a deck of <deckSize> cards by permuting it,
     * then taking the first <drawSize> elements.
     */
    function sampleN(
        uint256 seed,
        uint256 deckSize,
        uint256 drawSize
    ) public pure returns (uint256[] memory) {
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

    /*
     * Permutate an array using entropy provided by <seed>. Implementation 
     * translated from Jordi Baylina's typescript function @
     * www.github.com/jbaylina/random_permute/blob/main/test/test.js
     */
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

    /*
     * Whether <arr> includes <element>.
     */
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
}
