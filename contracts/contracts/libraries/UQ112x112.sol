// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// Ponto fixo de 112 bits inteiros + 112 bits fracionários (UQ112x112).
// Usado para calcular os preços acumulados (TWAP) no Pair.
library UQ112x112 {
    uint224 constant Q112 = 2 ** 112;

    // codifica um uint112 como UQ112x112
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112;
    }

    // divide um UQ112x112 por um uint112, retornando um UQ112x112
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}
