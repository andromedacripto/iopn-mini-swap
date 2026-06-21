// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

import "./interfaces/IOPNSwapFactory.sol";
import "./interfaces/IOPNSwapPair.sol";
import "./libraries/OPNSwapLibrary.sol";
import "./WOPN.sol";

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// Router: ponto de entrada que o frontend chama. Concentra toda a
// proteção de UX que o usuário final precisa.
//
// SEGURANÇA:
// - TODA função com efeito de troca/liquidez exige `deadline` e reverte
//   com `EXPIRED` se o bloco já passou - protege contra tx que fica
//   pendente na mempool e é executada tarde demais, com preço diferente.
// - `amountOutMin` / `amountInMax` são SEMPRE validados com `require`
//   explícito antes de qualquer transferência - não são apenas
//   sugestões da UI, são garantias on-chain de slippage.
// - Tokens do usuário vão direto para o Pair via `transferFrom`
//   (nunca passam pelo saldo do Router), eliminando o risco clássico
//   de um router malicioso "guardar" fundos de terceiros.
// - `receive()` só aceita OPN nativo vindo do contrato WOPN (proteção
//   contra envios acidentais/maliciosos de OPN direto pro router).
contract OPNSwapRouter {
    address public immutable factory;
    address payable public immutable WOPN_ADDRESS;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "OPNSwapRouter: EXPIRED");
        _;
    }

    constructor(address _factory, address payable _wopn) {
        require(_factory != address(0) && _wopn != address(0), "OPNSwapRouter: ZERO_ADDRESS");
        factory = _factory;
        WOPN_ADDRESS = _wopn;
    }

    receive() external payable {
        require(msg.sender == WOPN_ADDRESS, "OPNSwapRouter: ONLY_WOPN");
    }

    // ---------- LIQUIDEZ ----------

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB, address pair) {
        pair = IOPNSwapFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "OPNSwapRouter: PAIR_NOT_FOUND_CREATE_FIRST");

        (uint256 reserveA, uint256 reserveB) = OPNSwapLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = OPNSwapLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "OPNSwapRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = OPNSwapLibrary.quote(amountBDesired, reserveB, reserveA);
                require(amountAOptimal <= amountADesired, "OPNSwapRouter: EXCESSIVE_A_AMOUNT");
                require(amountAOptimal >= amountAMin, "OPNSwapRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    // o par precisa já existir (criado via factory.createPair) antes de adicionar liquidez
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair;
        (amountA, amountB, pair) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        require(IERC20Minimal(tokenA).transferFrom(msg.sender, pair, amountA), "OPNSwapRouter: TRANSFER_A_FAILED");
        require(IERC20Minimal(tokenB).transferFrom(msg.sender, pair, amountB), "OPNSwapRouter: TRANSFER_B_FAILED");
        liquidity = IOPNSwapPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = OPNSwapLibrary.pairFor(factory, tokenA, tokenB);
        require(IOPNSwapPair(pair).transferFrom(msg.sender, pair, liquidity), "OPNSwapRouter: LP_TRANSFER_FAILED");
        (uint256 amount0, uint256 amount1) = IOPNSwapPair(pair).burn(to);
        (address token0, ) = OPNSwapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, "OPNSwapRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "OPNSwapRouter: INSUFFICIENT_B_AMOUNT");
    }

    // ---------- SWAP ----------

    // envia os tokens da etapa intermediária diretamente de par para par
    // (nunca passam pelo saldo do Router)
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = OPNSwapLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2 ? OPNSwapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            IOPNSwapPair(OPNSwapLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    // swap token -> token com valor de entrada exato e mínimo de saída garantido
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = OPNSwapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OPNSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            IERC20Minimal(path[0]).transferFrom(msg.sender, OPNSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            "OPNSwapRouter: TRANSFER_FROM_FAILED"
        );
        _swap(amounts, path, to);
    }

    // swap token -> token com valor de saída exato e máximo de entrada garantido
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = OPNSwapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "OPNSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        require(
            IERC20Minimal(path[0]).transferFrom(msg.sender, OPNSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            "OPNSwapRouter: TRANSFER_FROM_FAILED"
        );
        _swap(amounts, path, to);
    }

    // swap OPN nativo -> token. msg.value é o valor exato de entrada.
    function swapExactOPNForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WOPN_ADDRESS, "OPNSwapRouter: INVALID_PATH");
        amounts = OPNSwapLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OPNSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        WOPN(WOPN_ADDRESS).deposit{value: amounts[0]}();
        require(
            WOPN(WOPN_ADDRESS).transfer(OPNSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            "OPNSwapRouter: WOPN_TRANSFER_FAILED"
        );
        _swap(amounts, path, to);
    }

    // swap token -> OPN nativo
    function swapExactTokensForOPN(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WOPN_ADDRESS, "OPNSwapRouter: INVALID_PATH");
        amounts = OPNSwapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "OPNSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            IERC20Minimal(path[0]).transferFrom(msg.sender, OPNSwapLibrary.pairFor(factory, path[0], path[1]), amounts[0]),
            "OPNSwapRouter: TRANSFER_FROM_FAILED"
        );
        _swap(amounts, path, address(this));
        uint256 amountOut = amounts[amounts.length - 1];
        WOPN(WOPN_ADDRESS).withdraw(amountOut);
        (bool success, ) = to.call{value: amountOut}("");
        require(success, "OPNSwapRouter: OPN_TRANSFER_FAILED");
    }

    // ---------- VIEWS AUXILIARES (sem efeito de estado) ----------

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        return OPNSwapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts) {
        return OPNSwapLibrary.getAmountsIn(factory, amountOut, path);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB) {
        return OPNSwapLibrary.quote(amountA, reserveA, reserveB);
    }
}
