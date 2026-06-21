// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

import "./interfaces/IOPNSwapFactory.sol";
import "./OPNSwapPair.sol";

// Factory responsável por criar e indexar os pares de liquidez.
//
// SEGURANÇA:
// - `createPair` usa CREATE2 com salt determinístico (hash ordenado dos
//   dois tokens), então o endereço do par é previsível e não pode ser
//   sequestrado por front-running.
// - `initialize` no Pair só pode ser chamado pela própria factory,
//   logo após o deploy, fechando a janela de inicialização.
// - Apenas `feeToSetter` pode alterar `feeTo`/`feeToSetter` (controle
//   de acesso simples, sem upgradeability, sem proxy — menor superfície
//   de ataque possível para este propósito didático).
contract OPNSwapFactory is IOPNSwapFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    constructor(address _feeToSetter) {
        require(_feeToSetter != address(0), "OPNSwap: ZERO_ADDRESS");
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "OPNSwap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "OPNSwap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "OPNSwap: PAIR_EXISTS");

        bytes memory bytecode = type(OPNSwapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(pair != address(0), "OPNSwap: CREATE2_FAILED");

        OPNSwapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populado nas duas direções
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "OPNSwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "OPNSwap: FORBIDDEN");
        require(_feeToSetter != address(0), "OPNSwap: ZERO_ADDRESS");
        feeToSetter = _feeToSetter;
    }
}
