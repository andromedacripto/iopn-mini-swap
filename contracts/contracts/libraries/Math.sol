// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// Biblioteca matemática mínima usada pelo Pair (mint de liquidez inicial).
// Não há divisão por zero nem overflow: Solidity 0.8+ já reverte
// automaticamente em overflow/underflow, então não precisamos de
// SafeMath manual aqui (diferente do Uniswap V2 original de 2020).
library Math {
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    // Babylonian method para raiz quadrada inteira
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
        // y == 0 -> z permanece 0
    }
}
