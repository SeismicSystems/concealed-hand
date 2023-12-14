include "../node_modules/circomlib/circuits/comparators.circom";

template IncrementingArray(SZ) {
    signal output indices[SZ];

    for (var i = 0; i < SZ; i++) {
        indices[i] <== i;
    }
}

template Truncate(ARRAY_SZ, TRUNC_SZ) {
    signal input arr[ARRAY_SZ];
    signal output out[TRUNC_SZ];

    for (var i = 0; i < TRUNC_SZ; i++) {
        out[i] <== arr[i];
    }
}

template ArrayInclusion(ARRAY_SZ) {
    signal input element;
    signal input arr[ARRAY_SZ];
    signal output out;

    signal prods[ARRAY_SZ + 1];
    prods[0] <== 1;
    for (var i = 0; i < ARRAY_SZ; i++) {
        prods[i + 1] <== prods[i] * (element - arr[i]);
    }

    out <== IsEqual()([prods[ARRAY_SZ], 0]);
}
